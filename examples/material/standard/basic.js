import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"
import {
  MeshMaterial3D,
  DirectionalLight,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  CuboidMeshBuilder,
  MeshMaterialPlugin,
  StandardMaterial,
  UVSphereMeshBuilder,
  OrbitCameraControls,
  SkyBox,
  TextureType,
  LightPlugin,
  AmbientLight,
  CanvasTarget,
  SkyboxPlugin,
  CameraPlugin
} from "chorama"

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  plugins: [
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
    new CameraPlugin()
  ]
})
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

// lights
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
directionalLight.intensity = 10
ambientLight.intensity = 0.3

const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
  flipY: true
})
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

const material = new StandardMaterial({
  mainTexture: texture
})
const object1 = new MeshMaterial3D(new CuboidMeshBuilder().build(), material)
const object2 = new MeshMaterial3D(new UVSphereMeshBuilder().build(), material)
const skyBox = new SkyBox({
  day
})

object1.transform.position.x = -1
object2.transform.position.x = 1
skyBox.transform.orientation.rotateY(Math.PI)

//set up the camera
cameraControls.distance = 2.5
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

function update() {
  object1.transform.orientation
    .rotateX(Math.PI / 1000)
    .rotateY(Math.PI / 1000)
  object2.transform.orientation
    .rotateX(Math.PI / 1000)
    .rotateY(Math.PI / 1000)
  renderer.render([object1, object2, skyBox, ambientLight, directionalLight, camera], renderDevice)
  cameraControls.update()

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
// demo-only GUI controls
const settings = {
  dummy: {
    r: 0,
    g: 0,
    b: 0,
    a: 0
  }
}
const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")

buildOptionsFolder
  .addColor(settings, 'dummy')
  .name('Base Color')
  .onChange((value) => {
    material.color.set(
      value.r / 255,
      value.g / 255,
      value.b / 255
    )
  })
buildOptionsFolder
  .add(material, 'metallic', 0, 1)
  .name("Metallic")
buildOptionsFolder
  .add(material, 'roughness', 0, 1)
  .name("Roughness")
buildOptionsFolder
  .add(material, 'emissiveIntensity', 0, 1)
  .name("Emissive Intensity")
buildOptionsFolder
  .addColor(settings, 'dummy')
  .name('Emissive Color')
  .onChange((value) => {
    material.emissiveColor.set(
      value.r / 255,
      value.g / 255,
      value.b / 255
    )
  })
buildOptionsFolder.open()
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
