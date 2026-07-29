import Stats from "stats.js";
import {
  MeshMaterial3D,
  BasicMaterial,
  LambertMaterial,
  PhongMaterial,
  Quaternion,
  DirectionalLight,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  CuboidMeshBuilder,
  UVSphereMeshBuilder,
  MeshMaterialPlugin,
  NormalMaterial,
  AmbientLight,
  LightPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama"

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)

// lights
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
ambientLight.intensity = 0.15

const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
const mesh1 = new CuboidMeshBuilder().build()
const mesh2 = new UVSphereMeshBuilder().build()
const materials = [
  new BasicMaterial({
    mainTexture: texture
  }),
  new NormalMaterial(),
  new LambertMaterial({
    mainTexture: texture
  }),
  new PhongMaterial({
    mainTexture: texture,
    specularShininess: 32,
    specularStrength: 0.5
  })
]

//create objects
const objects = materials.map(material => new MeshMaterial3D(mesh1, material))
  .concat(materials.map(material => new MeshMaterial3D(mesh2, material)))

//transform objects to thier positions
objects.forEach((object, i) => {
  const stepX = 1.6
  const stepY = 2
  const startX = -1.6
  const startY = 1.6
  const number = materials.length

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
  renderer.render([...objects, ambientLight, directionalLight, camera], renderDevice)
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
