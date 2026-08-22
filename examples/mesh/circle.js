import {
  MeshMaterial3D,
  BasicMaterial,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  CullFace,
  WireframeBuilder,
  OrbitCameraControls,
  Circle3DMeshBuilder,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama"
import Stats from "stats.js"
import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins:[
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
const meshBuilder = new Circle3DMeshBuilder()

//create objects
const object = new MeshMaterial3D(meshBuilder.build(), new BasicMaterial({
  mainTexture: texture
}))
object.material.cullFace = CullFace.None

//set up the camera
camera.transform.position.z = 5
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

function update() {
  cameraControls.update()
  renderer.render([object, camera], renderDevice)
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
// demo-only GUI controls
const settings = {
  wireframe: false
}
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, 'radius', 0, 2)
  .name("Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'arcStart', 0, Math.PI * 2)
  .name("Arc Start")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'arcLength', 0, Math.PI * 2)
  .name("Arc Length")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'segments', 1, 100, 1)
  .name("Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(settings, 'wireframe')
  .name("Wireframe")
  .onChange(buildMesh)
buildOptionsFolder.open()

function buildMesh() {
  const mesh = meshBuilder.build()
  if(settings.wireframe){
    object.mesh = new WireframeBuilder(mesh).build()
  } else {
    object.mesh = mesh
  }
}
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
