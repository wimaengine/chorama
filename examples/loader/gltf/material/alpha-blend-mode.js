import Stats from "stats.js";
import {
  WebGLRenderer,
  PerspectiveProjection,
  GLTFLoader,
  Camera,
  WebGLRenderDevice,
  OrbitCameraControls,
  LightPlugin,
  AmbientLight,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama";

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

// lighting
const ambientLight = new AmbientLight()

ambientLight.intensity = 0.5

const loader = new GLTFLoader()
const model = loader.load({
  paths: ["/models/glb/AlphaBlendModeTest.glb"]
})

cameraControls.distance = 2
cameraControls.offset.y = 0.8
cameraControls.azimuth = -Math.PI / 3
cameraControls.elevation = 0.25

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([model, ambientLight, camera], renderDevice)
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
