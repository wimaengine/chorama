import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "@examples/rendergraph_gui"
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
  TextureType,
  SkyBox,
  UVSphereMeshBuilder,
  CanvasTarget,
  BasicMaterial,
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
    new CameraPlugin(),
    new MeshMaterialPlugin(),
    new SkyboxPlugin()
  ]
})
const projection = new PerspectiveProjection()
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

// loaders
const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
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

//create objects
const material = new BasicMaterial({
  mainTexture: texture
})
const meshBuilder = new PlaneMeshBuilder()
meshBuilder.width = 10
meshBuilder.height = 10

const skyBox = new SkyBox({
  day
})
skyBox.transform.orientation.rotateY(Math.PI)
const ground = new MeshMaterial3D(meshBuilder.build(), material)
const objects = createObjects()

ground.transform.orientation.rotateX(-Math.PI / 2)

//set up the camera
cameraControls.distance = 5
camera.projection = projection

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

function update() {
  cameraControls.update()
  renderer.render([ground, ...objects, skyBox, camera], renderDevice)
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
const cameraFolder = controls.addFolder("Camera")

cameraFolder
  .add(projection, 'fov', Math.PI / 9, Math.PI / 2)
  .name('Field of View')
cameraFolder
  .add(projection, 'aspect', 0.25, 3)
  .name('Aspect Ratio')
cameraFolder
  .add(camera, 'near', 0.1, 10)
  .name('Near Plane')
cameraFolder
  .add(camera, 'far', 5, 20)
  .name('Far Plane')
cameraFolder.open()
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
