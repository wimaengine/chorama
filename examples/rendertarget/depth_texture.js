import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"
import Stats from "stats.js";
import {
  MeshMaterial3D,
  BasicMaterial,
  Quaternion,
  WebGLRenderer,
  Views,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  TextureType,
  Texture,
  TextureFormat,
  ImageRenderTarget,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  PlaneMeshBuilder,
  DepthMaterial,
  CanvasTarget,
  CameraPlugin,
  RenderTarget2DPool
} from "chorama"

const canvas = document.createElement('canvas')
const canvasTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new MeshMaterialPlugin(),
  ]
})

const depthTexture = new Texture({
  type: TextureType.Texture2D,
  format: TextureFormat.Depth24PlusStencil8
})
const renderTarget = new ImageRenderTarget({
  width: 1024,
  height: 1024,
  image: new Texture({
    type: TextureType.Texture2D,
    format: TextureFormat.RGBA16Float
  })
})

const camera1 = new Camera(renderTarget)
const camera2 = new Camera(canvasTarget)
const OFFSCREEN_VIEW = 0
const MAIN_VIEW = 1
const mesh = new CuboidMeshBuilder().build()
const quad = new PlaneMeshBuilder()
const depthMaterial = new DepthMaterial({
  depth: depthTexture
})

const object1 = new MeshMaterial3D(mesh, new BasicMaterial())
const object2 = new MeshMaterial3D(quad.build(), depthMaterial)

object1.renderMask.clear().on(OFFSCREEN_VIEW)
object2.renderMask.clear().on(MAIN_VIEW)
camera1.renderMask.clear().on(OFFSCREEN_VIEW)
camera2.renderMask.clear().on(MAIN_VIEW)

//set up the cameras
camera1.far = 500
camera1.transform.position.z = 5
camera2.transform.position.z = 1

if (
  camera1.projection instanceof PerspectiveProjection &&
  camera2.projection instanceof PerspectiveProjection
) {
  camera1.projection.fov = Math.PI / 180 * 60
  camera2.projection.fov = Math.PI / 180 * 60
}

document.body.append(canvas)
updateView()
addEventListener('resize', updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  renderer.render([object1, camera1], renderDevice)

  const views = renderer.getResource(Views)
  const targetPool = renderer.getResource(RenderTarget2DPool)
  const camera1View = views?.items().find((view) => view.object === camera1)

  if (camera1View?.depthTexture) {
    depthMaterial.depth = camera1View.depthTexture
  }

  renderer.render([object2, camera2], renderDevice)

  if (camera1View?.depthTexture && targetPool) {
    targetPool.recycle(camera1View.depthTexture)
  }

  object1.transform.orientation.multiply(
    Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)
  )
  stats.end()

  requestAnimationFrame(update)
}

function updateView() {
  const fullWidth = innerWidth * devicePixelRatio
  const fullHeight = innerHeight * devicePixelRatio

  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = fullWidth
  canvas.height = fullHeight

  if (
    camera1.projection instanceof PerspectiveProjection &&
    camera2.projection instanceof PerspectiveProjection
  ) {
    camera1.projection.aspect = fullWidth / fullHeight
    camera2.projection.aspect = fullWidth / fullHeight
  }
}

// demo-only GUI controls
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(camera1.transform.position, 'z', 1, 10)
  .name("Position Z")
buildOptionsFolder
  .add(camera1, 'near', 0.1, 10)
  .name("Camera Near")
  .onChange((value)=>depthMaterial.near = value)
buildOptionsFolder
  .add(camera1, 'far', 10, 500)
  .name("Camera Far")
  .onChange((value)=>depthMaterial.far = value)
buildOptionsFolder.open()
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')
