import { GUI } from "dat.gui"
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
    new MeshMaterialPlugin(),
  ]
})

const fallbackCamera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(fallbackCamera, canvas)
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

fallbackCamera.transform.position.z = 3
cameraControls.distance = 4
cameraControls.offset.y = 0.35
cameraControls.azimuth = -Math.PI / 4
cameraControls.elevation = 0.2

ambientLight.intensity = 0.65
directionalLight.intensity = 2.5
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 6)

const loader = new GLTFLoader()
const model = loader.load({
  paths: ["/models/gltf/cameras/basic.gltf"]
})

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

// GUI
/**
 * @typedef {"external" | "perspective" | "orthographic"} CameraSelection
 */

const cameraOptions = /** @type {const} */ ({
  External: "external",
  Perspective: "perspective",
  Orthographic: "orthographic"
})

const settings = {
  camera: cameraOptions.External
}
const controls = new GUI()
const cameraFolder = controls.addFolder("Camera")

cameraFolder
  .add(settings, "camera", cameraOptions)
  .name("Active Camera")
  .onChange(applyCameraSelection)
cameraFolder.open()

/**
 * @param {CameraSelection} root
 */
function applyCameraSelection(root) {

  if (root === 'external') {
    fallbackCamera.target = renderTarget
    return
  } else {
    fallbackCamera.target = undefined
  }

  model.traverseDFS((cam) => {
    if (cam instanceof Camera) {
      if (cam.projection instanceof PerspectiveProjection) {
        if (root === 'perspective') {
          cam.target = renderTarget
          return false
        } else {
          cam.target = undefined
        }
      } else {
        if (root === 'orthographic') {
          cam.target = renderTarget
          return false
        } else {
          cam.target = undefined
        }
      }
    }
    return true
  })

}

function update() {
  stats.begin()
  if (settings.camera === cameraOptions.External) {
    cameraControls.update()
  }
  renderer.render([model, ambientLight, directionalLight, fallbackCamera], renderDevice)
  if (fallbackCamera.projection instanceof PerspectiveProjection) {
    fallbackCamera.projection.aspect = innerWidth / innerHeight
  }
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
