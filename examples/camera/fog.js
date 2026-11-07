import Stats from "stats.js"
import { GUI } from "dat.gui"
import {
  AmbientLight,
  Camera,
  CameraPlugin,
  CanvasTarget,
  Color,
  DirectionalLight,
  ExponentialMode,
  ExponentialSquaredMode,
  Fog,
  GLTFLoader,
  LightPlugin,
  LinearMode,
  MeshMaterialPlugin,
  OrbitCameraControls,
  PerspectiveProjection,
  WebGLRenderDevice,
  WebGLRenderer
} from "chorama"

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true,
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ],
})

const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
const gltfLoader = new GLTFLoader()
const scene = gltfLoader.load({
  paths: ["/models/gltf/sponza/Sponza.gltf"],
})
const linearSettings = new LinearMode({ start: 1, end: 8 })
const exponentialSettings = new ExponentialMode({ density: 0.35 })
const exponentialSquaredSettings = new ExponentialSquaredMode({ density: 0.2 })

const fog = new Fog({
  color: new Color(0.72, 0.76, 0.8, 1),
  mode: linearSettings,
  height: 3,
  heightFalloff: 2,
})
camera.fog = fog
camera.near = 0.05
camera.far = 80

cameraControls.distance = 1
cameraControls.offset.x = -7
cameraControls.offset.y = 2
cameraControls.azimuth = -Math.PI / 2

const ambientLight = new AmbientLight()
ambientLight.intensity = 0.35

const directionalLight = new DirectionalLight()
directionalLight.intensity = 8
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 4)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([scene, ambientLight, directionalLight, camera], renderDevice)
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
}

/**
 * @param {boolean} enabled
 */
function applyFogEnabled(enabled) {
  camera.fog = enabled ? fog : undefined
}

/**
 * @param {Color} color
 */
function applyFogColor(color) {
  fog.color.set(color.r / 255, color.g / 255, color.b / 255, fog.color.a)
}

/**
 * @param {number} value
 */
function applyFogStart(value) {
  linearSettings.start = value
}

/**
 * @param {number} value
 */
function applyFogEnd(value) {
  linearSettings.end = value
}

/**
 * @param {"linear" | "exponential" | "exponential squared"} value
 */
function applyFogMode(value) {
  switch (value) {
    case "exponential":
      fog.mode = exponentialSettings
      break
    case "exponential squared":
      fog.mode = exponentialSquaredSettings
      break
    default:
      fog.mode = linearSettings
      break
  }
  updateFogModeControls()
}

/**
 * @param {number} value
 */
function applyFogDensity(value) {
  exponentialSettings.density = value
}

/**
 * @param {number} value
 */
function applyFogSquaredDensity(value) {
  exponentialSquaredSettings.density = value
}

/**
 * @param {number} value
 */
function applyFogHeight(value) {
  fog.height = value
}

/**
 * @param {number} value
 */
function applyFogHeightFalloff(value) {
  fog.heightFalloff = value
}

const settings = {
  enabled: true,
  color: fog.color.clone(),
  mode: "linear",
  height: fog.height,
  heightFalloff: fog.heightFalloff,
}

const controls = new GUI()
const fogFolder = controls.addFolder("Fog")

fogFolder
  .add(settings, "enabled")
  .name("Enabled")
  .onChange(applyFogEnabled)
fogFolder
  .addColor(settings, "color")
  .name("Color")
  .onChange(applyFogColor)
fogFolder
  .add(settings, "mode", ["linear", "exponential", "exponential squared"])
  .name("Mode")
  .onChange(applyFogMode)
const startController = fogFolder
  .add(linearSettings, "start", 0, 60, 0.1)
  .name("Start")
  .onChange(applyFogStart)
const endController = fogFolder
  .add(linearSettings, "end", 0, 60, 0.1)
  .name("End")
  .onChange(applyFogEnd)
const densityController = fogFolder
  .add(exponentialSettings, "density", 0, 2, 0.01)
  .name("Density")
  .onChange(applyFogDensity)
const squaredDensityController = fogFolder
  .add(exponentialSquaredSettings, "density", 0, 2, 0.01)
  .name("Density")
  .onChange(applyFogSquaredDensity)
fogFolder
  .add(settings, "height", 0, 20, 0.1)
  .name("Height")
  .onChange(applyFogHeight)
fogFolder
  .add(settings, "heightFalloff", 0, 10, 0.1)
  .name("Height Falloff")
  .onChange(applyFogHeightFalloff)

function updateFogModeControls() {
  const linear = settings.mode === "linear"
  const exponential = settings.mode === "exponential"
  startController.domElement.parentElement?.toggleAttribute("hidden", !linear)
  endController.domElement.parentElement?.toggleAttribute("hidden", !linear)
  densityController.domElement.parentElement?.toggleAttribute("hidden", !exponential)
  squaredDensityController.domElement.parentElement?.toggleAttribute("hidden", linear || exponential)
}

updateFogModeControls()
fogFolder.open()

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
