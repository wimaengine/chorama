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
  Quaternion,
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
  paths: ["/models/glb/BoxVertexColors.glb"]
})

camera.transform.position.z = 3
cameraControls.distance = 3
cameraControls.offset.y = 0.15
cameraControls.azimuth = -Math.PI / 4
cameraControls.elevation = 0.25

ambientLight.intensity = 0.9
directionalLight.intensity = 1.25
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 6)

const spin = Quaternion.fromEuler(0, Math.PI / 1800, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  model.transform.orientation.multiply(spin)
  cameraControls.update()
  renderer.render([model, ambientLight, directionalLight, camera], renderDevice)
  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
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
