import Stats from "stats.js"
import { GUI } from "dat.gui"
import {
  BasicMaterial,
  Camera,
  CameraPlugin,
  MeshMaterial3D,
  MeshMaterialPlugin,
  PerspectiveProjection,
  OrbitCameraControls,
  TextureLoader,
  TubeMeshBuilder,
  Vector3,
  WireframeBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  CanvasTarget
} from "chorama"

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  plugins: [
    new CameraPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
const material = new BasicMaterial({
  mainTexture: texture
})

const meshBuilder = new TubeMeshBuilder()
meshBuilder.points = [
  new Vector3(0.0, -0.5, 0.0),
  new Vector3(0.3, -0.2, 0.2),
  new Vector3(0.5, 0.1, 0.55),
  new Vector3(0.25, 0.35, 0.9),
  new Vector3(-0.15, 0.0, 1.2),
  new Vector3(0.12, -0.3, 1.45)
]
meshBuilder.radius = 0.07
meshBuilder.radialSegments = 12
const object = new MeshMaterial3D(meshBuilder.build(), material)

camera.transform.position.set(0, 0.35, 8)
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 100
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

const settings = {
  closed: meshBuilder.closed,
  wireframe: false
}
// demo-only GUI controls
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, "radius", 0.01, 0.5, 0.001)
  .name("Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "radialSegments", 3, 32, 1)
  .name("Radial Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(settings, "closed")
  .name("Closed")
  .onChange((value) => {
    meshBuilder.closed = value
    buildMesh()
  })
buildOptionsFolder
  .add(settings, "wireframe")
  .name("Wireframe")
  .onChange(buildMesh)
buildOptionsFolder.open()

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([object, camera], renderDevice)
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

function buildMesh() {
  const mesh = meshBuilder.build()
  if (settings.wireframe) {
    object.mesh = new WireframeBuilder(mesh).build()
  } else {
    object.mesh = mesh
  }
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
