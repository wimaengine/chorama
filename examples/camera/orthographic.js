import { GUI } from "dat.gui"
import { addRenderGraphGuiAddon } from "chorama"
import {
  MeshMaterial3D,
  WebGLRenderer,
  TextureLoader,
  Camera,
  WebGLRenderDevice,
  PlaneMeshBuilder,
  OrbitCameraControls,
  MeshMaterialPlugin,
  UVSphereMeshBuilder,
  CanvasTarget,
  BasicMaterial,
  OrthographicProjection,
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
  ]
})
const projection = new OrthographicProjection()
const camera = new Camera(renderTarget)
const cameraControls = new OrbitCameraControls(camera, canvas)

// loaders
const textureLoader = new TextureLoader()
const texture = textureLoader.load({
  paths: ["/images/uv.jpg"],
})

//create objects
const material = new BasicMaterial({
  mainTexture: texture
})
const meshBuilder = new PlaneMeshBuilder()
meshBuilder.width = 10
meshBuilder.height = 10

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
  renderer.render([ground, ...objects, camera], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
}

// demo-only GUI controls
const controls = new GUI()
const cameraFolder = controls.addFolder("Camera")

cameraFolder
  .add(projection, 'left', -10, -1)
  .name('Left')
cameraFolder
  .add(projection, 'right', 1, 10)
  .name('Right')
cameraFolder
  .add(projection, 'top', 1, 10)
  .name('Top')
cameraFolder
  .add(projection, 'bottom', -10, -1)
  .name('Bottom')
cameraFolder
  .add(camera, 'near', 0.1, 10)
  .name('Near Plane')
cameraFolder
  .add(camera, 'far', 5, 20)
cameraFolder.open()
addRenderGraphGuiAddon({
  gui: controls,
  renderer
})
