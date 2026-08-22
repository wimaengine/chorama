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
  TerrainMeshBuilder,
  TextureLoader,
  WireframeBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  CanvasTarget
} from "chorama"

/**
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
function sampleTerrainHeight(x, z) {
  return (
    Math.sin(x * 2.5) * Math.cos(z * 2.5) * 0.7 +
    Math.sin((x + z) * 1.5) * 0.25
  )
}

/**
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
function ridgeTerrainHeight(x, z) {
  return Math.sin(x * 4) * 0.18 + Math.cos(z * 3) * 0.15
}

const terrainHeightModes = {
  Hills: sampleTerrainHeight,
  Flat: () => 0,
  Ridges: ridgeTerrainHeight
}

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

const meshBuilder = new TerrainMeshBuilder()
meshBuilder.width = 1.8
meshBuilder.depth = 1.8
meshBuilder.widthSegments = 24
meshBuilder.depthSegments = 24
meshBuilder.heightScale = 0.35
meshBuilder.sampleHeight = terrainHeightModes.Hills
const object = new MeshMaterial3D(meshBuilder.build(), material)

camera.transform.position.set(0, 1.2, 6.8)
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 90
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

const settings = {
  sampleHeight: terrainHeightModes.Hills,
  wireframe: false
}
// demo-only GUI controls
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, "width", 0.2, 6, 0.01)
  .name("Width")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "depth", 0.2, 6, 0.01)
  .name("Depth")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "widthSegments", 1, 100, 1)
  .name("Width Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "depthSegments", 1, 100, 1)
  .name("Depth Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, "heightScale", 0, 2, 0.01)
  .name("Height Scale")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(settings, "sampleHeight", terrainHeightModes)
  .name("Height Pattern")
  .onChange((value) => {
    meshBuilder.sampleHeight = value
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
