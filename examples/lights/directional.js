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
  ShadowPlugin,
  LightPlugin,
  DirectionalLight,
  Quaternion,
  degToRad,
  AmbientLight,
  TextureType,
  SkyBox,
  UVSphereMeshBuilder,
  CanvasTarget,
  OrthographicShadow,
  PCFShadowFilter,
  PCSSShadowFilter,
  CuboidMeshBuilder,
  BasicMaterial,
  Color,
  LambertMaterial,
  SkyboxPlugin,
  StandardMaterial,
  PhongMaterial,
  CameraPlugin
} from "chorama"
import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "@examples/rendergraph_gui"

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

// assets and loaders
const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
})
const skyboxTexture = textureLoader.load({
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
/**@type {[LambertMaterial, PhongMaterial,StandardMaterial]} */
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
const arrowBuilder = new CuboidMeshBuilder()
const meshBuilder = new PlaneMeshBuilder()

meshBuilder.width = 10
meshBuilder.height = 10
arrowBuilder.width = 0.1
arrowBuilder.height = 0.1
arrowBuilder.depth = 1

// objects
const ambientLight = new AmbientLight()
const sun = new DirectionalLight()
const shadow = new OrthographicShadow()
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
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)
const lightHelper = new MeshMaterial3D(arrowBuilder.build(), new BasicMaterial({
  color: Color.RED.clone()
}))
const skyBox = new SkyBox({
  day: skyboxTexture
})
const ground = new MeshMaterial3D(meshBuilder.build(), materials[0])
const objects = createObjects()

ambientLight.intensity = 0.15
sun.transform.position.y = 2
sun.transform.position.z = 0
sun.transform.orientation.rotateX(- Math.PI / 2)
sun.intensity = 1
sun.shadow = shadow
shadow.projection.top = 10
shadow.projection.bottom = -10
shadow.projection.left = -10
shadow.projection.right = 10
shadow.bias = 0.002
shadow.far = 20
shadow.filterMode = undefined
lightHelper.transform.position.z -= 0.5
sun.add(lightHelper)

skyBox.transform.orientation.rotateY(Math.PI)
ground.transform.orientation.rotateX(-Math.PI / 2)

//set up the camera
cameraControls.distance = 3
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
  renderer.render([ground, ...objects, sun, ambientLight, skyBox, camera], renderDevice)
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
  x: -90,
  y: 0,
  z: 0,
  color: {
    r: 0,
    g: 0,
    b: 0
  },
  material: options[0],
  shadow: true,
  shadowWidth: 20,
  shadowHeight: 20
}
const controls = new GUI()
const lightFolder = controls.addFolder("Light")
const shadowFolder = controls.addFolder("Shadows")
/**
 * @type {import("dat.gui").GUIController<object>}
 */
let shadowRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowSearchRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowPenumbraControl

lightFolder
  .add(sun.transform.position, 'x', -10, 10)
  .name("Translate X")
lightFolder
  .add(sun.transform.position, 'y', -10, 10)
  .name("Translate Y")
lightFolder
  .add(sun.transform.position, 'z', -10, 10)
  .name("Translate Z")
lightFolder
  .add(settings, 'x', -360, 360)
  .name("Rotate X")
  .onChange(transformLight)
lightFolder
  .add(settings, 'y', -360, 360)
  .name("Rotate Y")
  .onChange(transformLight)
lightFolder
  .add(settings, 'z', -360, 360)
  .name("Rotate Z")
  .onChange(transformLight)
lightFolder
  .add(sun, 'intensity', 0, 100)
  .name("Intensity")
  lightFolder
  .add(settings, 'material', options)
  .name("Material")
  .onChange(changeMaterial)
lightFolder
  .addColor(settings, 'color')
  .name('Color')
  .onChange((value) => {
    sun.color.set(
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
  .add(settings, 'shadowWidth', 1, 20)
  .name('Width')
  .onChange(updateShadowWidth)
shadowFolder
  .add(settings, 'shadowHeight', 1, 20)
  .name('Height')
  .onChange(updateShadowHeight)
shadowFolder
  .add(shadow, 'near', 0.1, 1)
  .name('Near')
shadowFolder
  .add(shadow, 'far', 1, 100)
  .name('Far')
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

function transformLight() {
  const quaternion = Quaternion.fromEuler(
    degToRad(settings.x),
    degToRad(settings.y),
    degToRad(settings.z)
  )
  sun.transform.orientation.copy(quaternion)
}

/**
 * @param {number} value
 */
function updateShadowWidth(value){
  shadow.projection.left = -value / 2
  shadow.projection.right = value / 2
}

/**
 * @param {number} value
 */
function updateShadowHeight(value){
  shadow.projection.top = value / 2
  shadow.projection.bottom = -value / 2
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

/**
 * @param {boolean} value
 */
function toggleShadows(value) {
  if (value) {
    sun.shadow = shadow
  } else {
    sun.shadow = undefined
  }
}

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

addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
