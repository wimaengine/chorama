import Stats from "stats.js";
import {
  OBJLoader,
  BasicMaterial,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  Quaternion,
  MeshMaterial3D,
  LambertMaterial,
  PhongMaterial,
  WebGLRenderDevice,
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
  plugins:[
    new CameraPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
const textureLoader = new TextureLoader()
const loader = new OBJLoader()
const texture = textureLoader.load({
  paths: ["/models/obj/pirate_girl/pirate_girl.png"],
  flipY: true
})
const model = loader.load({
  paths: ["/models/obj/pirate_girl/pirate_girl.obj"],
  postprocessor:(asset)=>{
    asset.traverseDFS((object)=>{
      if (object instanceof MeshMaterial3D) {
        if(
          object.material instanceof BasicMaterial ||
          object.material instanceof LambertMaterial ||
          object.material instanceof PhongMaterial
        ){
          object.material.mainTexture = texture
        }
      }
      return true
    })
  }
})
camera.transform.position.z = 2
camera.transform.position.y = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
  camera.projection.aspect = innerWidth / innerHeight
}

const rotation = Quaternion.fromEuler(0, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  model.transform.orientation.multiply(rotation)
  renderer.render([model, camera], renderDevice)
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
