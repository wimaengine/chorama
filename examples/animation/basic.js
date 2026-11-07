import Stats from "stats.js"
import {
  AmbientLight,
  AnimationPlayer,
  AnimationPlugin,
  Camera,
  CameraPlugin,
  CanvasTarget,
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
  depth: true,
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new AnimationPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ],
})

const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
const gltfLoader = new GLTFLoader()
const animatedCube = gltfLoader.load({
  paths: ["/models/gltf/animated_cube/index.gltf"],
  postprocessor: (asset) => {
    asset.traverseDFS((object) => {
      if (object instanceof AnimationPlayer) {
        object.animations.forEach((playback) => {
          playback.repeatMode = PlaybackRepeat.Forever
        })
      }

      return true
    })
  }
})
const morphCube = gltfLoader.load({
  paths: ["/models/glb/AnimatedMorphCube.glb"],
  postprocessor: (asset) => {
    asset.traverseDFS((object) => {
      if (object instanceof AnimationPlayer) {
        object.animations.forEach((playback) => {
          playback.repeatMode = PlaybackRepeat.Forever
        })
      }

      return true
    })
  }
})

animatedCube.transform.position.x = -2
morphCube.transform.position.x = 2

const ambientLight = new AmbientLight()
ambientLight.intensity = 1.5

cameraControls.azimuth = -Math.PI / 4
cameraControls.elevation = Math.PI / 8
cameraControls.distance = 5

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
  renderer.render([animatedCube, morphCube, ambientLight, camera], renderDevice)
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
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
