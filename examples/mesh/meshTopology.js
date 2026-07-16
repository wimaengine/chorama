import Stats from "stats.js";
import { GUI } from "dat.gui"
import {
  MeshMaterial3D,
  BasicMaterial,
  PrimitiveTopology,
  WebGLRenderer,
  PerspectiveProjection,
  Camera,
  WebGLRenderDevice,
  PlaneMeshBuilder,
  Mesh,
  MeshMaterialPlugin,
  CanvasTarget,
  CameraPlugin
} from "chorama"

// performance monitor
const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute('style')
stats.dom.classList.add('performance-monitor')

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

document.body.append(canvas)
updateView()

const meshBuilder = new PlaneMeshBuilder()
const material = new BasicMaterial()
/**@type {[Mesh, Mesh, Mesh, Mesh, Mesh, Mesh, Mesh]} */
const meshes = [
  meshBuilder.build(),
  meshBuilder.build(),
  meshBuilder.build(),
  meshBuilder.build(),
  meshBuilder.build(),
  meshBuilder.build(),
  meshBuilder.build()
]
meshes[0].topology = PrimitiveTopology.Points
meshes[1].topology = PrimitiveTopology.Lines
meshes[2].topology = PrimitiveTopology.LineLoop
meshes[3].topology = PrimitiveTopology.LineStrip
meshes[4].topology = PrimitiveTopology.Triangles
meshes[5].topology = PrimitiveTopology.TriangleStrip
meshes[6].topology = PrimitiveTopology.TriangleFan

//create objects
const objects = meshes.map(object => new MeshMaterial3D(object, material))

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

requestAnimationFrame(update)

function update() {
  stats.begin()
  renderer.render([...objects, camera],renderDevice)
  stats.end()
  
  requestAnimationFrame(update)
}

addEventListener("resize", updateView)

const controls = new GUI()
const buildOptionsFolder = controls.addFolder("Settings")
buildOptionsFolder
  .add(meshBuilder, "width", 0, 4, 0.01)
  .name("Width")
  .onFinishChange(buildMeshes)
buildOptionsFolder
  .add(meshBuilder, "height", 0, 4, 0.01)
  .name("Height")
  .onFinishChange(buildMeshes)
buildOptionsFolder
  .add(meshBuilder, "widthSegments", 1, 100, 1)
  .name("Width Segments")
  .onFinishChange(buildMeshes)
buildOptionsFolder
  .add(meshBuilder, "heightSegments", 1, 100, 1)
  .name("Height Segments")
  .onFinishChange(buildMeshes)
buildOptionsFolder.open()

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  if (camera.projection instanceof PerspectiveProjection) {
    camera.projection.aspect = innerWidth / innerHeight
  }
}

function buildMeshes() {
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshBuilder.build()
    switch (i) {
      case 0:
        mesh.topology = PrimitiveTopology.Points
        break
      case 1:
        mesh.topology = PrimitiveTopology.Lines
        break
      case 2:
        mesh.topology = PrimitiveTopology.LineLoop
        break
      case 3:
        mesh.topology = PrimitiveTopology.LineStrip
        break
      case 4:
        mesh.topology = PrimitiveTopology.Triangles
        break
      case 5:
        mesh.topology = PrimitiveTopology.TriangleStrip
        break
      case 6:
        mesh.topology = PrimitiveTopology.TriangleFan
        break
    }
    meshes[i] = mesh
    const object = objects[i]
    if (object) {
      object.mesh = mesh
    }
  }
}
