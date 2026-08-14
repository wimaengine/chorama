import Stats from "stats.js";
import { GUI } from "dat.gui";
import {
  WebGLRenderer,
  PerspectiveProjection,
  GLTFLoader,
  Camera,
  WebGLRenderDevice,
  MeshMaterialPlugin,
  MeshMaterial3D,
  OrbitCameraControls,
  TextureType,
  SkyBox,
  TextureLoader,
  DirectionalLight,
  LightPlugin,
  AmbientLight,
  CanvasTarget,
  SkyboxPlugin,
  CameraPlugin,
  EnvironmentMap,
  StandardMaterial,
} from "chorama";

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

const environmentMap = renderer.getResource(EnvironmentMap)

// lighting
const ambientLight = new AmbientLight()
const directionalLight = new DirectionalLight()

directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)
directionalLight.intensity = 10
ambientLight.intensity = 0.1

// camera and camera controls
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()

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
  generateMipmaps: true,
})

environmentMap?.set(day)

const skyBox = new SkyBox({
  day
})
skyBox.transform.orientation.rotateY(Math.PI)

const model = gltfLoader.load({
  paths: ["/models/glb/teapot.glb"]
})

model.transform.orientation.rotateY(-Math.PI / 8)

cameraControls.distance = 2.4
cameraControls.offset.y = 0.1
cameraControls.azimuth = -Math.PI / 4
cameraControls.elevation = 0.2

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
  syncMaterials()
  model.transform.orientation.rotateY(Math.PI / 4000)
  renderer.render([model, skyBox, ambientLight, directionalLight, camera], renderDevice)
  cameraControls.update()
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

// demo-only GUI controls
const controls = new GUI()
const materialFolder = controls.addFolder("Teapot Material")
const settings = {
  reflectionStrength: 1.0,
  transmission: 1,
  thickness: 0.08,
  roughness: 0.02,
  metallic: 0.0,
  ior: 1.52
}

materialFolder
  .add(settings, "reflectionStrength", 0, 1, 0.01)
  .name("Reflection Strength")
  .onChange(syncMaterials)
materialFolder
  .add(settings, "transmission", 0, 1, 0.01)
  .name("Transmission")
  .onChange(syncMaterials)
materialFolder
  .add(settings, "thickness", 0, 20, 0.01)
  .name("Thickness")
  .onChange(syncMaterials)
materialFolder
  .add(settings, "roughness", 0, 1, 0.01)
  .name("Roughness")
  .onChange(syncMaterials)
materialFolder
  .add(settings, "metallic", 0, 1, 0.01)
  .name("Metallic")
  .onChange(syncMaterials)
materialFolder
  .add(settings, "ior", 1.0, 15, 0.01)
  .name("IOR")
  .onChange(syncMaterials)
syncMaterials()
materialFolder.open()

function syncMaterials() {
  model.traverseDFS(applyTeapotMaterial)
}

/**
 * @param {import("chorama").Object3D} child
 * @returns {boolean}
 */
function applyTeapotMaterial(child) {
  if (!(child instanceof MeshMaterial3D)) {
    return true
  }
  const material = child.material

  if (material instanceof StandardMaterial) {
    material.reflectionStrength = settings.reflectionStrength
    material.transmission = settings.transmission
    material.thickness = settings.thickness
    material.roughness = settings.roughness
    material.metallic = settings.metallic
    material.ior = settings.ior
  }

  return true
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
