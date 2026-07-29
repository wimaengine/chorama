import Stats from "stats.js";
import {
  MeshMaterial3D,
  CuboidMeshBuilder,
  Quaternion,
  WebGLRenderer,
  TextureLoader,
  BasicMaterial,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  MeshMaterialPlugin,
  LightPlugin,
  CanvasTarget,
  CameraPlugin
} from 'chorama';

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  plugins:[
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)

const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
const meshBuilder = new CuboidMeshBuilder()
meshBuilder.width = 0.5 
meshBuilder.height = 0.5 
meshBuilder.depth = 0.5

const mesh = meshBuilder.build()
const material = new BasicMaterial({
  mainTexture: texture
})
const parent = new MeshMaterial3D(mesh, material)
const child = new MeshMaterial3D(mesh, material)

child.transform.position.x = 1
camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
  camera.projection.aspect = innerWidth / innerHeight
}
parent.add(child)

const rotation = Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  parent.transform.orientation.multiply(rotation)

  renderer.render([parent, camera],renderDevice)
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

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')
