import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  ACESFilmicTonemapping,
  AgXTonemapping,
  AmbientLight,
  Camera,
  CameraPlugin,
  CanvasTarget,
  DirectionalLight,
  GLTFLoader,
  HableTonemapping,
  KhronosPBRNeutralTonemapping,
  LightPlugin,
  MeshMaterialPlugin,
  OrbitCameraControls,
  PerspectiveProjection,
  ReinhardToneMapping,
  SkyBox,
  SkyboxPlugin,
  TextureLoader,
  TextureType,
  WebGLRenderDevice,
  WebGLRenderer,
} from "chorama"

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas)
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

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
})
const skyBox = new SkyBox({
  day
})
skyBox.transform.orientation.rotateY(Math.PI)

const model = gltfLoader.load({
  paths: ["/models/gltf/flight_helmet/index.gltf"]
})

const ambientLight = new AmbientLight()
ambientLight.intensity = 0.18

const directionalLight = new DirectionalLight()
directionalLight.intensity = 28
directionalLight.transform.orientation
  .rotateX(-Math.PI / 4)
  .rotateZ(-Math.PI / 4)

const toneMappingOptions = {
  None: "none",
  Reinhard: "reinhard",
  Hable: "hable",
  "ACES Filmic": "aces_filmic",
  AgX: "agx",
  "Khronos PBR Neutral": "khronos_pbr_neutral",
}
const settings = {
  toneMapping: toneMappingOptions.Reinhard,
  exposure: 1,
  ambientLight: ambientLight.intensity,
  directionalLight: directionalLight.intensity,
}

cameraControls.distance = 0.8
cameraControls.offset.y = 0.5
applyToneMapping()

if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
createControls()
requestAnimationFrame(update)

function update() {
  stats.begin()
  cameraControls.update()
  renderer.render([model, skyBox, ambientLight, directionalLight, camera], renderDevice)
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

function createControls() {
  const controls = new GUI()
  const cameraFolder = controls.addFolder("Camera")
  const lightingFolder = controls.addFolder("Lighting")

  cameraFolder
    .add(settings, "toneMapping", toneMappingOptions)
    .name("Tone Mapping")
    .onChange(applyToneMapping)
  cameraFolder
    .add(settings, "exposure", 0.1, 5, 0.01)
    .name("Exposure")
    .onChange(applyExposure)
  cameraFolder.open()

  lightingFolder
    .add(settings, "ambientLight", 0, 2, 0.01)
    .name("Ambient")
    .onChange((value) => {
      ambientLight.intensity = value
    })
  lightingFolder
    .add(settings, "directionalLight", 0, 80, 0.1)
    .name("Directional")
    .onChange((value) => {
      directionalLight.intensity = value
    })
  lightingFolder.open()
}

function applyToneMapping() {
  switch (settings.toneMapping) {
    case toneMappingOptions.None:
      camera.toneMapping = undefined
      break
    case toneMappingOptions.Hable:
      camera.toneMapping = new HableTonemapping({ exposure: settings.exposure })
      break
    case toneMappingOptions["ACES Filmic"]:
      camera.toneMapping = new ACESFilmicTonemapping({ exposure: settings.exposure })
      break
    case toneMappingOptions.AgX:
      camera.toneMapping = new AgXTonemapping({ exposure: settings.exposure })
      break
    case toneMappingOptions["Khronos PBR Neutral"]:
      camera.toneMapping = new KhronosPBRNeutralTonemapping({ exposure: settings.exposure })
      break
    case toneMappingOptions.Reinhard:
    default:
      camera.toneMapping = new ReinhardToneMapping({ exposure: settings.exposure })
      break
  }
}

function applyExposure() {
  if (camera.toneMapping) {
    camera.toneMapping.exposure = settings.exposure
  }
}

// demo-only performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
