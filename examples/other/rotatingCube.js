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
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  AmbientLight,
  LightPlugin,
  CanvasTarget,
  CameraPlugin
} from 'chorama';

const canvas = document.createElement('canvas')
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderTarget = new CanvasTarget(canvas)
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)

// lights
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
ambientLight.intensity = 0.15

const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
const box = new MeshMaterial3D(
  new CuboidMeshBuilder().build(),
  new LambertMaterial({
    mainTexture: texture
  })
)
camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
}

const rotation = Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  box.transform.orientation.multiply(rotation)
  renderer.render([box, ambientLight, directionalLight, camera], renderDevice)
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
