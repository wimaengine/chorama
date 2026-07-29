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
  AmbientLight,
  TextureType,
  SkyBox,
  UVSphereMeshBuilder,
  CanvasTarget,
  CuboidMeshBuilder,
  LambertMaterial,
  SkyboxPlugin,
  SpotLight,
  SpotLightShadow,
  PCFShadowFilter,
  PCSSShadowFilter,
  Affine3,
  Vector3,
  BasicMaterial,
  Color,
  Object3D,
  CameraPlugin
} from "chorama"
import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "@examples/rendergraph_gui"

const canvas = document.createElement('canvas')
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
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
const material = new LambertMaterial({
  mainTexture: texture
})
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
const spotShadow = new SpotLightShadow()
const lights = createLights()
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

const skyBox = new SkyBox({
  day: skyboxTexture
})
const ground = new MeshMaterial3D(meshBuilder.build(), material)
const objects = createObjects()

ambientLight.intensity = 0.15
sun.transform.position.y = 2
sun.transform.position.z = 0
sun.transform.orientation.rotateX(- Math.PI / 2)
sun.intensity = 0.01

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
      const object = new MeshMaterial3D(sphereMesh, material)

      object.transform.position.x = x
      object.transform.position.y = 0.5
      object.transform.position.z = y
      results.push(object)
    }
  }

  return results
}

function createLights() {
  const builder = new CuboidMeshBuilder()
  const width = 10
  const height = 10
  const tallness = 4
  const scale = 0.1
  const lights = new Object3D()

  builder.width = 0.1
  builder.height = 0.1
  builder.depth = 1

  const mesh = builder.build()
  for (let x = -width / 2; x <= width / 2; x += width) {
    for (let y = -height / 2; y <= height / 2; y += height) {
      const light = new SpotLight()
      const helper = new MeshMaterial3D(mesh, new BasicMaterial({
        color: Color.RED.clone()
      }))
      const space = new Affine3()

      space.translate(new Vector3(x, tallness, y))
      space.lookAt(new Vector3(x * scale, 0, y * scale), Vector3.Y)

      const [position, orientation, _scale] = space.decompose()

      helper.transform.position.z -= 0.5
      light.intensity = 1
      light.range = 20
      light.outerAngle = Math.PI / 8
      light.shadow = spotShadow
      light.transform.position.copy(position)
      light.transform.orientation.copy(orientation)
      light.add(helper)
      lights.add(light)
    }
  }
  return lights
}

function update() {
  cameraControls.update()
  lights.transform.orientation.rotateY(0.01)
  renderer.render([ground, ...objects, sun, lights, ambientLight, skyBox, camera], renderDevice)
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

const settings = {
  shadow: true
}
const shadowFilterSettings = {
  mode: 'None',
  get radius() {
    return (spotShadow.filterMode instanceof PCFShadowFilter || spotShadow.filterMode instanceof PCSSShadowFilter)
      ? spotShadow.filterMode.radius
      : 1
  },
  set radius(value) {
    if (spotShadow.filterMode instanceof PCFShadowFilter || spotShadow.filterMode instanceof PCSSShadowFilter) {
      spotShadow.filterMode.radius = value
    }
  },
  get searchRadius() {
    return spotShadow.filterMode instanceof PCSSShadowFilter ? spotShadow.filterMode.searchRadius : 2
  },
  set searchRadius(value) {
    if (spotShadow.filterMode instanceof PCSSShadowFilter) {
      spotShadow.filterMode.searchRadius = value
    }
  },
  get penumbra() {
    return spotShadow.filterMode instanceof PCSSShadowFilter ? spotShadow.filterMode.penumbra : 1
  },
  set penumbra(value) {
    if (spotShadow.filterMode instanceof PCSSShadowFilter) {
      spotShadow.filterMode.penumbra = value
    }
  }
}
// demo-only GUI controls
const controls = new GUI()
const shadowFolder = controls.addFolder("Shadows")
/**
 * @type {import("dat.gui").GUIController<object>}
 */
let shadowRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowSearchRadiusControl
/** @type {import("dat.gui").GUIController<object>} */
let shadowPenumbraControl

shadowFolder
  .add(settings, 'shadow')
  .name("Enable Shadow")
  .onChange(toggleShadows)
spotShadow.filterMode = undefined
shadowFolder
  .add(shadowFilterSettings, 'mode', ['None', 'PCF', 'PCSS'])
  .name("Shadow Filter")
  .onChange(updateShadowFilterMode)
shadowRadiusControl = shadowFolder
  .add(shadowFilterSettings, 'radius', 0, 4, 0.1)
  .name("PCF Radius")
shadowSearchRadiusControl = shadowFolder
  .add(shadowFilterSettings, 'searchRadius', 0, 8, 0.1)
  .name("PCSS Search Radius")
shadowPenumbraControl = shadowFolder
  .add(shadowFilterSettings, 'penumbra', 0, 6, 0.1)
  .name("PCSS Penumbra")
updateShadowFilterControls()
shadowFolder.open()

/**
 * @param {boolean} value
 */
function toggleShadows(value) {
  if (value) {
    lights.traverseDFS(light => {
      if(light instanceof SpotLight){
        light.shadow = spotShadow
      }
      return true
    })
  } else {
    lights.traverseDFS(light => {
      if(light instanceof SpotLight){
        light.shadow = undefined
      }
      return true
    })
  }
}

function updateShadowFilterControls() {
  const isPCF = spotShadow.filterMode instanceof PCFShadowFilter
  const isPCSS = spotShadow.filterMode instanceof PCSSShadowFilter
  shadowRadiusControl.domElement.style.display = (isPCF || isPCSS) ? '' : 'none'
  shadowSearchRadiusControl.domElement.style.display = isPCSS ? '' : 'none'
  shadowPenumbraControl.domElement.style.display = isPCSS ? '' : 'none'
}

/**
 * @param {string} value
 */
function updateShadowFilterMode(value) {
  if (value === 'PCF') {
    spotShadow.filterMode = new PCFShadowFilter()
  } else if (value === 'PCSS') {
    spotShadow.filterMode = new PCSSShadowFilter()
  } else {
    spotShadow.filterMode = undefined
  }
  updateShadowFilterControls()
}

addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
