import Stats from "stats.js"
import { GUI } from "dat.gui"
import {
  BasicMaterial,
  Camera,
  CameraPlugin,
  FrustumMeshBuilder,
  MeshMaterial3D,
  MeshMaterialPlugin,
  PerspectiveProjection,
  OrbitCameraControls,
  TextureLoader,
  WireframeBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  CanvasTarget
} from "chorama"

const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")

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

const meshBuilder = new FrustumMeshBuilder()
meshBuilder.radiusTop = 0.3
meshBuilder.radiusBottom = 0.55
meshBuilder.height = 1.3
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

const controls = new GUI()
const settings = {
  wireframe: false
}
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, "radiusTop", 0, 2, 0.01)
  .name("Top Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "radiusBottom", 0, 2, 0.01)
  .name("Bottom Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "height", 0, 4, 0.01)
  .name("Height")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "heightSegments", 1, 64, 1)
  .name("Height Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "radialSegments", 3, 100, 1)
  .name("Radial Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "arcStart", 0, Math.PI * 2, 0.01)
  .name("Arc Start")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "arcLength", 0, Math.PI * 2, 0.01)
  .name("Arc Length")
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
