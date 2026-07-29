import Stats from "stats.js";
import {
  PerspectiveProjection,
  Quaternion,
  WebGLRenderer,
  SkyBox,
  TextureLoader,
  TextureType,
  Camera,
  WebGLRenderDevice,
  MeshMaterialPlugin,
  CanvasTarget,
  SkyboxPlugin,
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
    new MeshMaterialPlugin(),
    new SkyboxPlugin()
  ]
})
const camera = new Camera(renderTarget)
const textureLoader = new TextureLoader()
const day = textureLoader.load({
  paths: [
    "/images/skybox/miramar_right.png",
    "/images/skybox/miramar_left.png",
    "/images/skybox/miramar_top.png",
    "/images/skybox/miramar_bottom.png",
    "/images/skybox/miramar_back.png",
    "/images/skybox/miramar_front.png",
  ],
  type: TextureType.TextureCubeMap,
})
const night = textureLoader.load({
  paths: [
    "/images/skybox/grimmnight_right.png",
    "/images/skybox/grimmnight_left.png",
    "/images/skybox/grimmnight_top.png",
    "/images/skybox/grimmnight_bottom.png",
    "/images/skybox/grimmnight_back.png",
    "/images/skybox/grimmnight_front.png",
  ],
  type: TextureType.TextureCubeMap
})
const skyBox = new SkyBox({
  day,
  night,
})
camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 2
  camera.projection.aspect = innerWidth / innerHeight
}

let number = 0, direction = 1
const interval = 0.001
const rotation = Quaternion.fromEuler(0, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  skyBox.lerp = number

  const next = number + interval * direction
  if (number > 1 || number < 0) {
    direction *= -1
    if (direction === -1) {
      number = 1
    } else {
      number = 0
    }
  } else {
    number = next
  }

  camera.transform.orientation.multiply(rotation)
  renderer.render([skyBox, camera],renderDevice)
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
