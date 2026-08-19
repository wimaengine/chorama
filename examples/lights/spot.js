import {
  MeshMaterial3D,
  WebGLRenderer,
  TextureLoader,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  PlaneMeshBuilder,
  OrbitCameraControls,
  MeshMaterialPlugin,
  LightPlugin,
  AmbientLight,
  TextureType,
  SkyBox,
  UVSphereMeshBuilder,
  LambertMaterial,
  BasicMaterial,
  Color,
  PhongMaterial,
  StandardMaterial,
  SpotLight,
  Vector3,
  CuboidMeshBuilder,
  Affine3,
  CanvasTarget,
  SkyboxPlugin,
  ShadowPlugin,
  PCFShadowFilter,
  PCSSShadowFilter,
  SpotLightShadow,
  CameraPlugin
} from "chorama"
import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas,{
  depth:true
})
const renderer = new WebGLRenderer({
  plugins: [
    new CameraPlugin(),
    new ShadowPlugin(),
    new LightPlugin(),
    new SkyboxPlugin(),
    new MeshMaterialPlugin(),
  ]
})

// loaders
const textureLoader = new TextureLoader()

//  assets
const environmentTexture = textureLoader.load({
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
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
})
/**@type {[LambertMaterial, PhongMaterial, StandardMaterial]} */
const materials = [
  new LambertMaterial({
    mainTexture: texture
  }),
  new PhongMaterial({
    mainTexture: texture
  }),
  new StandardMaterial({
    mainTexture: texture,
    roughness: 0.4,
    metallic: 0
  })
]
const meshBuilder = new PlaneMeshBuilder()
const lightMeshBuilder = new CuboidMeshBuilder()
lightMeshBuilder.height = 0.01
lightMeshBuilder.width = 0.01
lightMeshBuilder.depth = 0.5
meshBuilder.width = 10
meshBuilder.height = 10

// objects
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

const ambientLight = new AmbientLight()

const shadow = new SpotLightShadow()
const shadowFilterSettings = {
  mode: 'None',
  get radius() {
    return (shadow.filterMode instanceof PCFShadowFilter || shadow.filterMode instanceof PCSSShadowFilter)
      ? shadow.filterMode.radius
      : 1
  },
  set radius(value) {
    if (shadow.filterMode instanceof PCFShadowFilter || shadow.filterMode instanceof PCSSShadowFilter) {
      shadow.filterMode.radius = value
    }
  },
  get searchRadius() {
    return shadow.filterMode instanceof PCSSShadowFilter ? shadow.filterMode.searchRadius : 2
  },
  set searchRadius(value) {
    if (shadow.filterMode instanceof PCSSShadowFilter) {
      shadow.filterMode.searchRadius = value
    }
  },
  get penumbra() {
    return shadow.filterMode instanceof PCSSShadowFilter ? shadow.filterMode.penumbra : 1
  },
  set penumbra(value) {
    if (shadow.filterMode instanceof PCSSShadowFilter) {
      shadow.filterMode.penumbra = value
    }
  }
}
const light = new SpotLight()
const skyBox = new SkyBox({
  day: environmentTexture
})
const ground = new MeshMaterial3D(meshBuilder.build(), materials[0])
const objects = createObjects()
const lightHelper = new MeshMaterial3D(lightMeshBuilder.build(), new BasicMaterial({
  color: new Color(1, 0, 0)
}))

ambientLight.intensity = 0.15
skyBox.transform.orientation.rotateY(Math.PI)
light.intensity = 1
light.add(lightHelper)
light.transform.position.y = 1
light.range = 10
light.shadow = shadow
shadow.filterMode = undefined
ground.transform.orientation.rotateX(-Math.PI / 2)

//set up the camera
cameraControls.distance = 2
if (camera.projection instanceof PerspectiveProjection) {
  camera.projection.fov = Math.PI / 180 * 75
  camera.projection.aspect = innerWidth / innerHeight
}

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

function createObjects() {
  const results = []
  const meshBuilder2 = new UVSphereMeshBuilder()
  meshBuilder2.radius = 0.25
  const sphereMesh = meshBuilder2.build()

  for (let x = -5; x < 5; x++) {
    for (let y = -5; y < 5; y++) {
      const object = new MeshMaterial3D(sphereMesh, materials[0])

      object.transform.position.x = x
      object.transform.position.y = 0.5
      object.transform.position.z = y
      results.push(object)
    }
  }

  return results
}

function update() {
  cameraControls.update()
  renderer.render([ground, ...objects, light, ambientLight, skyBox, camera], renderDevice)
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
const options = [
  'LAMBERT',
  'PHONG',
  'STANDARD'
]
const settings = {
  position: new Vector3(),
  color: {
    r: 0,
    g: 0,
    b: 0
  },
  material: options[0],
  shadow: true
}
const controls = new GUI()
const lightFolder = controls.addFolder("Light")
const shadowFolder = controls.addFolder("Shadow")
/**
 * @type {import("dat.gui").GUIController<object>}
 */
let shadowRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowSearchRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowPenumbraControl
lightFolder
  .add(light.transform.position, 'x', -10, 10)
  .name("Translate X")
lightFolder
  .add(light.transform.position, 'y', 0, 2)
  .name("Translate Y")
lightFolder
  .add(light.transform.position, 'z', -10, 10)
  .name("Translate Z")
lightFolder
  .add(settings.position, 'x', -1, 1)
  .name("Direction X")
  .onChange(setOrientation)
lightFolder
  .add(settings.position, 'y', -1, 1)
  .name("Direction Y")
  .onChange(setOrientation)
lightFolder
  .add(settings.position, 'z', -1, 1)
  .name("Direction Z")
  .onChange(setOrientation)
lightFolder
  .add(light, 'intensity', 0, 100)
  .name("Intensity")
lightFolder
  .add(light, 'innerAngle', 0, Math.PI / 2)
  .name("Inner Angle")
lightFolder
  .add(light, 'outerAngle', 0, Math.PI / 2)
  .name("Outer Angle")
lightFolder
  .add(light, 'range', 0, 10)
  .name("Range")
lightFolder
  .add(light, 'decay', 0, 100)
  .name("Distance Decay")
lightFolder
  .add(settings, 'material', options)
  .name("Material")
  .onChange(changeMaterial)
lightFolder
  .addColor(settings, 'color')
  .name('Color')
  .onChange((value) => {
    light.color.set(
      value.r / 255,
      value.g / 255,
      value.b / 255
    )
  })
shadowFolder
  .add(settings, 'shadow')
  .name("Enable Shadow")
  .onChange(toggleShadows)
shadowFolder
  .add(shadow, 'near', 0.1, 1)
  .name('Near')
shadowFolder
  .add(shadow, 'bias', 0, 0.01)
  .name('Bias')
shadowFolder
  .add(shadow, 'normalBias', 0, 0.005)
  .name('Normal Bias')
shadowFolder
  .add(shadowFilterSettings, 'mode', ['None', 'PCF', 'PCSS'])
  .name('Shadow Filter')
  .onChange(updateShadowFilterMode)
shadowRadiusControl = shadowFolder
  .add(shadowFilterSettings, 'radius', 0, 4, 0.1)
  .name('PCF Radius')
shadowSearchRadiusControl = shadowFolder
  .add(shadowFilterSettings, 'searchRadius', 0, 8, 0.1)
  .name('PCSS Search Radius')
shadowPenumbraControl = shadowFolder
  .add(shadowFilterSettings, 'penumbra', 0, 6, 0.1)
  .name('PCSS Penumbra')
updateShadowFilterControls()
lightFolder.open()
shadowFolder.open()
/**
 * @param {string} value
 */
function changeMaterial(value) {
  switch (value) {
    case options[0]:
      objects.forEach((o) => o.material = materials[0])
      ground.material = materials[0]
      break;
    case options[1]:
      objects.forEach((o) => o.material = materials[1])
      ground.material = materials[1]
      break;
    case options[2]:
      objects.forEach((o) => o.material = materials[2])
      ground.material = materials[2]
      break;
    default:
      break;
  }
}

function setOrientation() {
  const transform = Affine3.lookAt(settings.position.normalize(), Vector3.Zero, Vector3.Y)
  const [_, orientation] = transform.decompose()
  light.transform.orientation.copy(orientation)
}

/**
 * @param {boolean} value
 */
function toggleShadows(value) {
  if (value) {
    light.shadow = shadow
  } else {
    light.shadow = undefined
  }
}

function updateShadowFilterControls() {
  const isPCF = shadow.filterMode instanceof PCFShadowFilter
  const isPCSS = shadow.filterMode instanceof PCSSShadowFilter
  shadowRadiusControl.domElement.style.display = (isPCF || isPCSS) ? '' : 'none'
  shadowSearchRadiusControl.domElement.style.display = isPCSS ? '' : 'none'
  shadowPenumbraControl.domElement.style.display = isPCSS ? '' : 'none'
}

/**
 * @param {string} value
 */
function updateShadowFilterMode(value) {
  if (value === 'PCF') {
    shadow.filterMode = new PCFShadowFilter()
  } else if (value === 'PCSS') {
    shadow.filterMode = new PCSSShadowFilter()
  } else {
    shadow.filterMode = undefined
  }
  updateShadowFilterControls()
}

addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
