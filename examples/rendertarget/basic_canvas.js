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
  ViewRectangle,
  TextureType,
  SkyBox,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  SkyboxPlugin,
  CameraPlugin
} from "chorama"
import { GUI } from "dat.gui";
import { addRenderGraphGuiAddon } from "chorama";

const canvas = document.createElement('canvas')
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderTarget = new CanvasTarget(canvas)
const renderer = new WebGLRenderer({
  renderDevice,
  plugins:[
    new CameraPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
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

//set up the camera
camera.target = renderTarget
camera.transform.position.z = 1.5
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
updateView()
addEventListener('resize',updateView)
requestAnimationFrame(update)

function update() {
  object.transform.orientation.multiply(
    Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)
  )

  renderer.render([skyBox, object, camera], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  const fullWidth = innerWidth * devicePixelRatio
  const fullHeight = innerHeight * devicePixelRatio

  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = fullWidth
  canvas.height = fullHeight
  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = fullWidth / fullHeight
  }
}
// demo-only GUI controls
const settings = {
  enableScissors: false
}
const controls = new GUI()
const canvasopts = controls.addFolder("Camera View")
canvasopts.add(camera.viewport.offset, 'x', 0, 1).name("Viewport X")
canvasopts.add(camera.viewport.offset, 'y', 0, 1).name("Viewport Y")
canvasopts.add(camera.viewport.size, 'x', 0, 1).name("Viewport Width")
canvasopts.add(camera.viewport.size, 'y', 0, 1).name("Viewport Hieght")
/**@type {GUI} */
let scissorsFolder
canvasopts.add(settings, "enableScissors").onChange((value) => {
  if (value) {
    camera.scissor = new ViewRectangle()
    scissorsFolder = canvasopts.addFolder('Scissors')
    scissorsFolder.add(camera.scissor.offset, 'x', 0, 1).name("Scissor X")
    scissorsFolder.add(camera.scissor.offset, 'y', 0, 1).name("Scissor Y")
    scissorsFolder.add(camera.scissor.size, 'x', 0, 1).name("Scissor Width")
    scissorsFolder.add(camera.scissor.size, 'y', 0, 1).name("Scissor Hieght")
  } else {
    canvasopts.removeFolder(scissorsFolder)
    camera.scissor = undefined
  }
})
canvasopts.open()

addRenderGraphGuiAddon({
  gui: controls,
  renderer,
  position: { x: 24, y: 24 }
})
