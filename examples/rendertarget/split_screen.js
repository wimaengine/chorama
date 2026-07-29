import Stats from "stats.js";
import {
  MeshMaterial3D,
  BasicMaterial,
  Quaternion,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  CanvasTarget,
  TextureType,
  SkyBox,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  SkyboxPlugin,
  CameraPlugin
} from "chorama"

const canvas = document.createElement('canvas')
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderTarget1 = new CanvasTarget(canvas)
const renderTarget2 = new CanvasTarget(canvas)
const renderer = new WebGLRenderer({
  plugins:[
    new CameraPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

const camera1 = new Camera(renderTarget1)
const camera2 = new Camera(renderTarget2)
const LEFT_VIEW = 0
const RIGHT_VIEW = 1
const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
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
})
const material = new BasicMaterial({
  mainTexture: texture
})

//create objects
const object = new MeshMaterial3D(new CuboidMeshBuilder().build(), material)
const skyBox = new SkyBox({
  day,
})

object.renderMask.clear().on(LEFT_VIEW).on(RIGHT_VIEW)
skyBox.renderMask.clear().on(LEFT_VIEW)
camera1.renderMask.clear().on(LEFT_VIEW)
camera2.renderMask.clear().on(RIGHT_VIEW)

// set up render targets
renderTarget1.viewport.offset.set(0, 0)
renderTarget1.viewport.size.set(0.5, 1)
renderTarget2.viewport.offset.set(0.5, 0)
renderTarget2.viewport.size.set(0.5, 1)

//set up the cameras
camera1.transform.position.z = 5
camera2.transform.position.z = 5
if (
  camera1.projection instanceof PerspectiveProjection &&
  camera2.projection instanceof PerspectiveProjection
) {
  camera1.projection.fov = Math.PI / 180 * 90
  camera2.projection.fov = Math.PI / 180 * 90
}

document.body.append(canvas)
updateView()
addEventListener('resize', updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  object.transform.orientation.multiply(
    Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)
  )

  renderer.render([skyBox, object, camera1, camera2], renderDevice)
  stats.end()
  
  requestAnimationFrame(update)
}

function updateView() {
  const fullWidth = innerWidth * devicePixelRatio
  const fullHeight = innerHeight * devicePixelRatio
  const halfFullWidth = fullWidth / 2

  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = fullWidth
  canvas.height = fullHeight

  if (camera1.projection instanceof PerspectiveProjection) {
    camera1.projection.aspect = halfFullWidth / fullHeight
  }
  if (camera2.projection instanceof PerspectiveProjection) {
    camera2.projection.aspect = halfFullWidth / fullHeight
  }
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')
