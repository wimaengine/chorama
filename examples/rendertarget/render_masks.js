import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"
import {
  MeshMaterial3D,
  BasicMaterial,
  Color,
  Quaternion,
  WebGLRenderer,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  CanvasTarget,
  ViewRectangle,
  CuboidMeshBuilder,
  PlaneMeshBuilder,
  UVSphereMeshBuilder,
  MeshMaterialPlugin,
  CameraPlugin
} from "chorama"

const settings = {
  slider: 0.5
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
    new MeshMaterialPlugin(),
  ]
})

const camera1 = new Camera(renderTarget1)
const camera2 = new Camera(renderTarget2)

// render mask bits
const LEFT_VIEW = 0
const RIGHT_VIEW = 1

// create objects
const planeBuilder = new PlaneMeshBuilder()
planeBuilder.width = 8
planeBuilder.height = 8

const plane = new MeshMaterial3D(planeBuilder.build(), new BasicMaterial({
  color: new Color(0.75, 0.78, 0.82)
}))
const box = new MeshMaterial3D(new CuboidMeshBuilder().build(), new BasicMaterial({
  color: new Color(0.9, 0.35, 0.2)
}))
const sphereBuilder = new UVSphereMeshBuilder()
sphereBuilder.radius = 0.6
const sphere = new MeshMaterial3D(sphereBuilder.build(), new BasicMaterial({
  color: new Color(0.2, 0.55, 0.95)
}))

plane.transform.orientation.rotateX(-Math.PI / 2)
plane.transform.position.y = -0.5

box.transform.position.x = -1.6
box.transform.position.y = 0.5

sphere.transform.position.x = 1.6
sphere.transform.position.y = 0.15

box.renderMask.clear().on(LEFT_VIEW)

sphere.renderMask.clear().on(RIGHT_VIEW)

camera1.renderMask.clear().on(LEFT_VIEW)

camera2.renderMask.clear().on(RIGHT_VIEW)

const scene = [
  plane,
  box,
  sphere
]

const rotation = Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)

camera1.transform.position.x = -4
camera1.transform.position.y = 3
camera1.transform.position.z = 6
camera1.transform.orientation.rotateY(-Math.PI / 6)
camera1.transform.orientation.rotateX(-Math.PI / 8)

camera2.transform.position.x = 4
camera2.transform.position.y = 3
camera2.transform.position.z = 6
camera2.transform.orientation.rotateY(Math.PI / 6)
camera2.transform.orientation.rotateX(-Math.PI / 8)

camera1.clearColor?.set(0.92, 0.95, 1.0, 1)
camera2.clearColor?.set(0.92, 0.95, 1.0, 1)

camera1.viewport.size.set(1, 1)
camera2.viewport.size.set(1, 1)

// set up scissors
camera1.scissor = new ViewRectangle()
camera2.scissor = new ViewRectangle()

// set up the cameras
if (
  camera1.projection instanceof PerspectiveProjection &&
  camera2.projection instanceof PerspectiveProjection
) {
  camera1.projection.fov = Math.PI / 180 * 60
  camera2.projection.fov = Math.PI / 180 * 60
}

document.body.append(canvas)
updateView()
updateRenderTargets(settings.slider)
addEventListener('resize', updateView)
requestAnimationFrame(update)

function update() {
  box.transform.orientation.multiply(rotation)
  sphere.transform.orientation.multiply(rotation)

  renderer.render([...scene, camera1, camera2], renderDevice)
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

  updateRenderTargets(settings.slider)
}
// demo-only GUI controls
const controls = new GUI()
const screenFolder = controls.addFolder("Settings")
const slider = screenFolder.add(settings, 'slider', 0.2, 0.8).name("Split")
slider.onChange(updateRenderTargets)
screenFolder.open()

/**
 * @param {number} value
 */
function updateRenderTargets(value) {
  if (camera1.scissor && camera2.scissor) {
    camera1.scissor.offset.set(0, 0)
    camera1.scissor.size.set(value, 1)
    camera2.scissor.offset.set(value, 0)
    camera2.scissor.size.set(1 - value, 1)
  }
}

addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
