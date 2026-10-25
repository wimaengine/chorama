import Stats from "stats.js"
import {
  AmbientLight,
  BasicMaterial,
  Camera,
  CameraPlugin,
  CameraPrepasses,
  CanvasTarget,
  Color,
  CullFace,
  DirectionalLight,
  GLTFLoader,
  LightPlugin,
  Material,
  MeshMaterial3D,
  MeshMaterialPlugin,
  OrbitCameraControls,
  PerspectiveProjection,
  CuboidMeshBuilder,
  SkyBox,
  SkyboxPlugin,
  TextureLoader,
  TextureType,
  UVSphereMeshBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  basicVertex,
  depthPrepassFragment,
  TransparentMode,
} from "chorama"

/**
 * A small custom material used to demonstrate a transparent object alongside
 * the camera depth prepass. The edge glow is calculated from the view angle,
 * so the sphere reads as a force-field shield without an extra texture.
 */
class ShieldMaterial extends Material {
  color = new Color(0.05, 0.55, 1, 0.58)

  constructor() {
    super()
    // Show both sides of the sphere so the shield remains visible from inside.
    this.cullFace = CullFace.None
  }

  /** @override */
  vertex() {
    return basicVertex
  }

  /** @override */
  fragment() {
    return `
      in vec3 v_normal;
      in vec3 cam_direction;

      uniform MaterialBlock {
        vec4 color;
      };
      uniform sampler2D pre_pass_depth;

      out vec4 fragment_color;

      void main() {
        vec3 normal = normalize(v_normal);
        vec3 view_direction = normalize(cam_direction);
        float rim = pow(1.0 - abs(dot(normal, view_direction)), 5.0);
        float scanline = 0.85 + 0.15 * sin(gl_FragCoord.y * 0.08);

        // The camera prepass stores the opaque scene depth in the shared view
        // bind group. Compare it with this shield fragment to light contact
        // edges where the shield intersects the Sponza geometry.
        vec2 screen_uv = gl_FragCoord.xy / vec2(textureSize(pre_pass_depth, 0));
        float scene_depth = texture(pre_pass_depth, screen_uv).r;
        float depth_delta = abs(scene_depth - gl_FragCoord.z);
        float intersection = 1.0 - smoothstep(0.002, 0.018, depth_delta);

        vec3 glow = color.rgb * (0.22 + rim * 1.8 + intersection * 2.8) * scanline;
        float opacity = color.a * (0.12 + rim * 0.88 + intersection * 1.4);
        fragment_color = vec4(glow, opacity);
      }
    `
  }

  // Transparent objects are omitted from the opaque prepass, but the method
  // keeps this material compatible with cameras that request a prepass.
  /** @override */
  prepassFragment() {
    return depthPrepassFragment
  }

  /** @override */
  alphaBlendMode() {
    return new TransparentMode()
  }

  /**
   * @override
   * @param {DataView} data
   */
  getData(data) {
    const floats = new Float32Array(data.buffer, data.byteOffset, 4)
    floats[0] = this.color.r
    floats[1] = this.color.g
    floats[2] = this.color.b
    floats[3] = this.color.a
  }
}

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, { depth: true })
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
    new SkyboxPlugin(),
  ],
})

const camera = new Camera(renderTarget)
camera.prepasses = CameraPrepasses.Depth
const cameraControls = new OrbitCameraControls(camera, canvas)
cameraControls.distance = 0.8
cameraControls.offset.y = 0.5

const gltfLoader = new GLTFLoader()
const sponza = gltfLoader.load({
  paths: ["/models/gltf/sponza/Sponza.gltf"],
})

const textureLoader = new TextureLoader()
const skyBox = new SkyBox({
  day: textureLoader.load({
    paths: [
      "/images/skybox/miramar_right.png",
      "/images/skybox/miramar_left.png",
      "/images/skybox/miramar_top.png",
      "/images/skybox/miramar_bottom.png",
      "/images/skybox/miramar_back.png",
      "/images/skybox/miramar_front.png",
    ],
    type: TextureType.TextureCubeMap,
  }),
})
skyBox.transform.orientation.rotateY(Math.PI)

const shieldMeshBuilder = new UVSphereMeshBuilder()
shieldMeshBuilder.longitudeSegments = 64
shieldMeshBuilder.latitudeSegments = 32
const shield = new MeshMaterial3D(
  shieldMeshBuilder.build(),
  new ShieldMaterial(),
)
// The orbit target is (0, 0.5, 0), so this places the shield directly in
// front of the camera while keeping Sponza visible behind it.
shield.transform.position.y = 0.5
shield.transform.scale.set(0.65, 0.65, 0.65)

// Keep the cuboid close enough to the shield's surface that it passes through
// the shell instead of only orbiting outside it.
const cuboid = new MeshMaterial3D(
  new CuboidMeshBuilder().build(),
  new BasicMaterial({
    color: new Color(1, 0.22, 0.04),
  }),
)
cuboid.transform.scale.set(0.34, 0.34, 0.34)

const cuboidOrbitRadiusX = 0
const cuboidOrbitRadiusY = 0.12
const cuboidOrbitRadiusZ = 0.62
const cuboidOrbitCenterY = shield.transform.position.y

const ambientLight = new AmbientLight()
ambientLight.intensity = 0.45
const directionalLight = new DirectionalLight()
directionalLight.intensity = 7
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 4)

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

/** @param {number} time */
function update(time) {
  stats.begin()
  cameraControls.update()
  shield.transform.orientation.rotateY(0.004)
  const orbitAngle = time * 0.0012
  cuboid.transform.position.x = Math.cos(orbitAngle) * cuboidOrbitRadiusX
  cuboid.transform.position.y = cuboidOrbitCenterY + Math.sin(orbitAngle) * cuboidOrbitRadiusY
  cuboid.transform.position.z = Math.sin(orbitAngle) * cuboidOrbitRadiusZ
  cuboid.transform.orientation.rotateY(0.02)
  renderer.render(
    [sponza, cuboid, shield, skyBox, ambientLight, directionalLight, camera],
    renderDevice,
  )
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
}

const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
