import Stats from "stats.js";
import {
  MeshMaterial3D,
  TextureWrap,
  BasicMaterial,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  Sampler,
  PlaneMeshBuilder,
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
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"]
})
const sampler1 = new Sampler({
  wrapS: TextureWrap.Clamp,
  wrapT: TextureWrap.Clamp
})
const sampler2 = new Sampler({
  wrapS: TextureWrap.Repeat,
  wrapT: TextureWrap.Repeat
})
const sampler3 = new Sampler({
  wrapS: TextureWrap.MirrorRepeat,
  wrapT: TextureWrap.MirrorRepeat
})

const mesh = new PlaneMeshBuilder().build()
const buffer = mesh.attributes.get('uv')

if(buffer){
  const uvs = new Float32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / Float32Array.BYTES_PER_ELEMENT
  )

  for (let i in uvs) {
    // SAFETY: It is a number
    uvs[i] = /**@type {number}*/(uvs[i]) * 2
  }
}

const material1 = new BasicMaterial({
  mainTexture: texture,
  mainSampler: sampler1
})
const material2 = new BasicMaterial({
  mainTexture: texture,
  mainSampler: sampler2
})
const material3 = new BasicMaterial({
  mainTexture: texture,
  mainSampler: sampler3
})

const object1 = new MeshMaterial3D(mesh, material1)
const object2 = new MeshMaterial3D(mesh, material2)
const object3 = new MeshMaterial3D(mesh, material3)

object1.transform.position.x = -1.2
object2.transform.position.x = 0
object3.transform.position.x = 1.2

camera.transform.position.z = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
}

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  renderer.render([object1, object2, object3, camera],renderDevice)
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
