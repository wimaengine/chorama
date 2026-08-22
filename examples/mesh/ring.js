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
  RingMeshBuilder,
  TextureLoader,
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

const meshBuilder = new RingMeshBuilder()
meshBuilder.innerRadius = 0.22
meshBuilder.outerRadius = 0.56
meshBuilder.thickness = 0.16
meshBuilder.radialSegments = 24
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
  .add(meshBuilder, "innerRadius", 0, 1.5, 0.01)
  .name("Inner Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "outerRadius", 0, 2, 0.01)
  .name("Outer Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "thickness", 0, 1, 0.01)
  .name("Thickness")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "radialSegments", 3, 100, 1)
  .name("Radial Segments")
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
