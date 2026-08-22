import Stats from "stats.js";
import {
  WebGLRenderer,
  PerspectiveProjection,
  GLTFLoader,
  Camera,
  WebGLRenderDevice,
  MeshMaterialPlugin,
  OrbitCameraControls,
  TextureType,
  SkyBox,
  TextureLoader,
  DirectionalLight,
  LightPlugin,
  AmbientLight,
  CanvasTarget,
  SkyboxPlugin,
  CameraPlugin,
  EnvironmentMap
} from "chorama";

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

const environmentMap = renderer.getResource(EnvironmentMap)

// lighting
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
directionalLight.intensity = 18
ambientLight.intensity = 0.18

// camera and camera controls
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
document.body.append(canvas)
updateView()

const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()

const day = textureLoader.load({
  paths: [
    "/images/skybox/miramar_right.png",
    "/images/skybox/miramar_left.png",
    "/images/skybox/miramar_top.png",
    "/images/skybox/miramar_bottom.png",
    "/images/skybox/miramar_back.png",
    "/images/skybox/miramar_front.png",
  ],
  type: TextureType.TextureCubeMap,
  generateMipmaps: true,
})

environmentMap?.set(day)

const skyBox = new SkyBox({
  day
})
skyBox.transform.orientation.rotateY(Math.PI)

// The glTF model
const model = gltfLoader.load({
  paths: ["/models/glb/IridescenceLamp.glb"]
})

cameraControls.distance = 2.8
cameraControls.offset.y = 0.35
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  model.transform.orientation.rotateY(Math.PI / 4000)
  renderer.render([model, skyBox, ambientLight, directionalLight, camera], renderDevice)
  cameraControls.update()
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

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
