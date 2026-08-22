import Stats from "stats.js";
import {
  MeshMaterial3D,
  LambertMaterial,
  Quaternion,
  DirectionalLight,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  UVSphereMeshBuilder,
  AmbientLight,
  LightPlugin,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from 'chorama';

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
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

// lights
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
ambientLight.intensity = 0.15

camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
  camera.projection.aspect = innerWidth / innerHeight
}

const sphere = new MeshMaterial3D(
  new UVSphereMeshBuilder().build(),
  new LambertMaterial({
    mainTexture: texture,
  })
)
const rotation = Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  sphere.transform.orientation.multiply(rotation)
  renderer.render([sphere, directionalLight, ambientLight, camera],renderDevice)
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
