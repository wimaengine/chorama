import Stats from "stats.js"
import { GUI } from "dat.gui"
import {
  BasicMaterial,
  Camera,
  CameraPlugin,
  LatheMeshBuilder,
  MeshMaterial3D,
  MeshMaterialPlugin,
  PerspectiveProjection,
  OrbitCameraControls,
  TextureLoader,
  Vector2,
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
  renderDevice,
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

const meshBuilder = new LatheMeshBuilder()
meshBuilder.profile = [
  new Vector2(0, -0.65),
  new Vector2(0.34, -0.6),
  new Vector2(0.48, -0.2),
  new Vector2(0.4, 0.25),
  new Vector2(0.22, 0.58),
  new Vector2(0, 0.72)
]
meshBuilder.segments = 24
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

// demo-only GUI controls
const controls = new GUI()
const settings = {
  wireframe: false
}
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, "segments", 3, 100, 1)
  .name("Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "phiStart", 0, Math.PI * 2, 0.01)
  .name("Phi Start")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "phiLength", 0, Math.PI * 2, 0.01)
  .name("Phi Length")
  .onFinishChange(buildMesh)
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
