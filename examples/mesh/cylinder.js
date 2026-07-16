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
  CylinderMeshBuilder,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama"
import Stats from "stats.js"
import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "@examples/rendergraph_gui"

const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
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
const meshBuilder = new CylinderMeshBuilder()

// create objects
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

// gui controls
const settings = {
  wireframe: false
}
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, 'radiusTop', 0, 2)
  .name("Top Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'radiusBottom', 0, 2)
  .name("Bottom Radius")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'height', 0, 4)
  .name("Height")
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
  .add(meshBuilder, 'radialSegments', 3, 100, 1)
  .name("Radial Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(meshBuilder, 'heightSegments', 1, 100, 1)
  .name("Height Segments")
  .onFinishChange(buildMesh)
buildOptionsFolder
  .add(settings, 'wireframe')
  .name("Wireframe")
  .onChange(buildMesh)
buildOptionsFolder.open()

const facesFolder = buildOptionsFolder.addFolder("Open Ends")
facesFolder
  .add(meshBuilder.openEnds, 'top')
  .name("Front")
  .onChange(buildMesh)
facesFolder
  .add(meshBuilder.openEnds, 'bottom')
  .name("Back")
  .onChange(buildMesh)

function buildMesh() {
  const mesh = meshBuilder.build()
  if (settings.wireframe) {
    object.mesh = new WireframeBuilder(mesh).build()
  } else {
    object.mesh = mesh
  }
}
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
