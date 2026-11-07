import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  AmbientLight,
  AnimationPlugin,
  AnimationPlayer,
  Camera,
  CameraPlugin,
  CanvasTarget,
  DirectionalLight,
  GLTFLoader,
  LightPlugin,
  MeshMaterialPlugin,
  OrbitCameraControls,
  PerspectiveProjection,
  PlaybackRepeat,
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
    new AnimationPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin()
  ]
})

const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()
const loader = new GLTFLoader()

/** @type {AnimationPlayer | undefined} */
let animationPlayer

const model = loader.load({
  paths: ["/models/glb/MorphStressTest.glb"],
  postprocessor: (asset) => {
    asset.traverseDFS((object) => {
      if (object instanceof AnimationPlayer) {
        animationPlayer = object

        object.animations.forEach((playback) => {
          playback.repeatMode = PlaybackRepeat.Forever
        })

        return false
      }

      return true
    })

    applyClipSelection()
  }
})

cameraControls.distance = 4
cameraControls.offset.y = 0.1
cameraControls.azimuth = -Math.PI / 4
cameraControls.elevation = 0.2

ambientLight.intensity = 0.85
directionalLight.intensity = 2
directionalLight.transform.orientation
  .rotateX(-Math.PI / 3)
  .rotateY(Math.PI / 6)

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 70
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
  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
}

// gui
const controls = new GUI()
const animationFolder = controls.addFolder("Animation")

/**
 * @typedef {"Individuals" | "TheWave" | "Pulse"} MorphStressClip
 */

const morphStressClipOptions = /** @type {const} */ ({
  Individuals: "Individuals",
  TheWave: "TheWave",
  Pulse: "Pulse"
})

const settings = {
  clip: morphStressClipOptions.Individuals
}

animationFolder
  .add(settings, "clip", morphStressClipOptions)
  .name("Active Clip")
  .onChange(applyClipSelection)
animationFolder.open()

function applyClipSelection() {
  if (!animationPlayer) {
    return
  }

  const clip = animationPlayer.clipsByName.get(settings.clip)
  if (!clip) {
    return
  }

  animationPlayer.stopAll()
  animationPlayer.start(clip)
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
