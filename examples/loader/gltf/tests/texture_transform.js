import Stats from "stats.js"
import {
  AmbientLight,
  Camera,
  CameraPlugin,
  CanvasTarget,
  DirectionalLight,
  GLTFLoader,
  LightPlugin,
  MeshMaterialPlugin,
  OrbitCameraControls,
  PerspectiveProjection,
  WebGLRenderDevice,
  WebGLRenderer
} from "chorama"

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin()
  ]
})

const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()
const loader = new GLTFLoader()
const model = loader.load({
  paths: ["/models/glb/TextureTransformMultiTest.glb"]
})

cameraControls.distance = 3
cameraControls.offset.y = -0.2
cameraControls.azimuth = 0
cameraControls.elevation = 0

ambientLight.intensity = 0.1
directionalLight.intensity = 2
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 6)

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
  renderer.render([model, ambientLight, directionalLight, camera], renderDevice)
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
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
