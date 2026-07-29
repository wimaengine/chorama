import Stats from "stats.js";
import {
  MeshMaterial3D,
  BasicMaterial,
  Quaternion,
  CullFace,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  PlaneMeshBuilder,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama"

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
const mesh = new PlaneMeshBuilder().build()

/**@type {[BasicMaterial,BasicMaterial,BasicMaterial,BasicMaterial]} */
const materials = [
  new BasicMaterial({
    mainTexture: texture
  }),
  new BasicMaterial({
    mainTexture: texture
  }),
  new BasicMaterial({
    mainTexture: texture
  }),
  new BasicMaterial({
    mainTexture: texture
  })
]

materials[0].cullFace = CullFace.None
materials[1].cullFace = CullFace.Front
materials[2].cullFace = CullFace.Back
materials[3].cullFace = CullFace.FrontAndBack

//create objects
const objects = materials.map(material => new MeshMaterial3D(mesh, material))

//transform objects to their positions
objects.forEach((object, i) => {
  const stepX = 1.6
  const stepY = 2
  const startX = -1.6
  const startY = 1.6
  const number = 3

  object.transform.position.x = startX + stepX * (i % number)
  object.transform.position.y = startY - Math.floor(i / number) * stepY
})

//set up the camera
camera.transform.position.z = 5

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 120
  camera.projection.aspect = innerWidth / innerHeight
}

const rotation = Quaternion.fromEuler(Math.PI / 1000, Math.PI / 1000, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  stats.begin()
  objects.forEach(object => object.transform.orientation.multiply(rotation))
  renderer.render([...objects, camera], renderDevice)
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
