import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"
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
  ViewRectangle,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  SkyboxPlugin,
  CameraPlugin
} from "chorama"

const settings = {
  slider: 0
}
const canvas = document.createElement('canvas')
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderTarget1 = new CanvasTarget(canvas)
const renderTarget2 = new CanvasTarget(canvas)
const renderer = new WebGLRenderer({
  renderDevice,
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

// set up scissors
camera1.scissor = new ViewRectangle()
camera2.scissor = new ViewRectangle()

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
  object.transform.orientation.multiply(
    Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)
  )

  renderer.render([skyBox, object, camera1, camera2], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  const fullWidth = innerWidth * devicePixelRatio
  const fullHeight = innerHeight * devicePixelRatio

  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = fullWidth
  canvas.height = fullHeight

  if (camera1.projection instanceof PerspectiveProjection) {
    camera1.projection.aspect = fullWidth / fullHeight
  }
  if (camera2.projection instanceof PerspectiveProjection) {
    camera2.projection.aspect = fullWidth / fullHeight
  }
}
// demo-only GUI controls
const controls = new GUI()
const screenFolder = controls.addFolder("Settings")
const slider = screenFolder.add(settings, 'slider', 0, 1).name("Slider")
slider.onChange(updateRenderTargets)
screenFolder.open()

/**
 * @param {number} value
 */
function updateRenderTargets(value) {
  if (camera1.scissor && camera2.scissor) {
    camera1.scissor.size.set(value, 1)
    camera2.scissor.offset.set(value, 0)
    camera2.scissor.size.set(1 - value, 1)
  }
}
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
