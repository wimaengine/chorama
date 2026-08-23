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
  TextureType,
  SkyBox,
  Texture,
  TextureFormat,
  ImageRenderTarget,
  Color,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  CanvasTarget,
  SkyboxPlugin,
  CameraPlugin
} from "chorama"

const canvas = document.createElement('canvas')
const canvasTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins:[
    new CameraPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

const renderTarget = new ImageRenderTarget({
  width:1024,
  height:1024,
  image: new Texture({
    type:TextureType.Texture2D,
    format:TextureFormat.RGBA8Unorm
  })
})

const camera1 = new Camera(renderTarget)
const camera2 = new Camera(canvasTarget)
const OFFSCREEN_VIEW = 0
const MAIN_VIEW = 1

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
    "/images/skybox/miramar_front.png"
  ],
  type: TextureType.TextureCubeMap
})
const mesh = new CuboidMeshBuilder().build()
const object1 = new MeshMaterial3D(mesh, new BasicMaterial({
  mainTexture: texture
}))
const object2 = new MeshMaterial3D(mesh, new BasicMaterial({
  mainTexture: renderTarget.image
}))
const skyBox = new SkyBox({
  day,
  night:day
})

object1.renderMask.clear().on(OFFSCREEN_VIEW)
object2.renderMask.clear().on(MAIN_VIEW)
skyBox.renderMask.clear().on(MAIN_VIEW)
camera1.renderMask.clear().on(OFFSCREEN_VIEW)
camera2.renderMask.clear().on(MAIN_VIEW)

//set up the cameras
camera1.clearColor = Color.CYAN.clone()
camera1.target = renderTarget
camera1.transform.position.z = 5
camera2.transform.position.z = 5

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
  renderer.render([object1, skyBox, object2, camera1, camera2], renderDevice)

  object1.transform.orientation.multiply(
    Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)
  )
  object2.transform.orientation.multiply(
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

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')
