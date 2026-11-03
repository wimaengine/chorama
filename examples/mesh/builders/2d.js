import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  addRenderGraphGuiAddon,
  BasicMaterial,
  Camera,
  CameraPlugin,
  CanvasTarget,
  Circle3DMeshBuilder,
  CullFace,
  ExtrudeMeshBuilder,
  MeshMaterial2D,
  MeshMaterialPlugin,
  OrthographicProjection,
  PlaneMeshBuilder,
  PrismMeshBuilder,
  RingMeshBuilder,
  Vector2,
  WedgeMeshBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  WireframeBuilder
} from "chorama"

// Scene setup

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new MeshMaterialPlugin(),
  ]
})
const camera = new Camera(renderTarget)
const projection = new OrthographicProjection()
camera.projection = projection
camera.transform.position.z = 5

const builder = new PlaneMeshBuilder()
const material = new BasicMaterial()
material.cullFace = CullFace.None
const object = new MeshMaterial2D(builder.build2d(), material)

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

function update() {
  renderer.render([object, camera], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  const viewHeight = 3
  const viewWidth = viewHeight * innerWidth / innerHeight
  projection.left = -viewWidth * 0.5
  projection.right = viewWidth * 0.5
  projection.top = viewHeight * 0.5
  projection.bottom = -viewHeight * 0.5
}

// GUI

const builderOptions = [
  { name: "Plane", create: () => new PlaneMeshBuilder() },
  { name: "Circle", create: () => new Circle3DMeshBuilder() },
  { name: "Ring", create: () => new RingMeshBuilder() },
  {
    name: "Extrude",
    create: () => {
      const builder = new ExtrudeMeshBuilder()
      builder.contour = [
        new Vector2(-0.7, -0.45),
        new Vector2(0.1, -0.45),
        new Vector2(0.1, -0.1),
        new Vector2(0.65, -0.1),
        new Vector2(0.65, 0.45),
        new Vector2(-0.7, 0.45)
      ]
      return builder
    }
  },
  { name: "Prism", create: () => new PrismMeshBuilder() },
  { name: "Wedge", create: () => new WedgeMeshBuilder() }
]

let meshBuilder = createBuilder("Plane")

const settings = {
  builder: "Plane",
  wireframe: false
}
const controls = new GUI()
const settingsFolder = controls.addFolder("Settings")
settingsFolder
  .add(settings, "builder", builderOptions.map((option) => option.name))
  .name("Builder")
  .onChange(selectBuilder)
settingsFolder
  .add(settings, "wireframe")
  .name("Wireframe")
  .onChange(rebuildMesh)
settingsFolder.open()

/** @type {GUI | undefined} */
let builderPropertiesFolder

/**
 * @param {string} name
 */
function selectBuilder(name) {
  meshBuilder = createBuilder(name)
  rebuildMesh()
  updateBuilderProperties()
}

/**
 * @param {string} name
 */
function createBuilder(name) {
  const option = builderOptions.find((option) => option.name === name)
  if (!option) {
    throw new Error(`Unknown 2D mesh builder: ${name}`)
  }
  return option.create()
}

function rebuildMesh() {
  const mesh = meshBuilder.build2d()
  object.mesh = settings.wireframe
    ? new WireframeBuilder(mesh).build2d()
    : mesh
}

function updateBuilderProperties() {
  if (builderPropertiesFolder) {
    controls.removeFolder(builderPropertiesFolder)
  }

  builderPropertiesFolder = controls.addFolder(`${settings.builder} Properties`)
  addBuilderProperties(builderPropertiesFolder)
  builderPropertiesFolder.open()
}

/**
 * @param {GUI} folder
 */
function addBuilderProperties(folder) {
  switch (settings.builder) {
    case "Plane": {
      const builder = /** @type {PlaneMeshBuilder} */ (meshBuilder)
      folder.add(builder, "width", 0, 4, 0.01).name("Width").onFinishChange(rebuildMesh)
      folder.add(builder, "height", 0, 4, 0.01).name("Height").onFinishChange(rebuildMesh)
      folder.add(builder, "widthSegments", 1, 100, 1).name("Width Segments").onFinishChange(rebuildMesh)
      folder.add(builder, "heightSegments", 1, 100, 1).name("Height Segments").onFinishChange(rebuildMesh)
      break
    }
    case "Circle": {
      const builder = /** @type {Circle3DMeshBuilder} */ (meshBuilder)
      folder.add(builder, "radius", 0, 2, 0.01).name("Radius").onFinishChange(rebuildMesh)
      folder.add(builder, "segments", 3, 100, 1).name("Segments").onFinishChange(rebuildMesh)
      folder.add(builder, "arcStart", 0, Math.PI * 2, 0.01).name("Arc Start").onFinishChange(rebuildMesh)
      folder.add(builder, "arcLength", 0, Math.PI * 2, 0.01).name("Arc Length").onFinishChange(rebuildMesh)
      break
    }
    case "Ring": {
      const builder = /** @type {RingMeshBuilder} */ (meshBuilder)
      folder.add(builder, "innerRadius", 0, 2, 0.01).name("Inner Radius").onFinishChange(rebuildMesh)
      folder.add(builder, "outerRadius", 0, 2, 0.01).name("Outer Radius").onFinishChange(rebuildMesh)
      folder.add(builder, "radialSegments", 3, 100, 1).name("Radial Segments").onFinishChange(rebuildMesh)
      break
    }
    case "Extrude": {
      const builder = /** @type {ExtrudeMeshBuilder} */ (meshBuilder)
      for (let i = 0; i < builder.contour.length; i++) {
        const point = builder.contour[i]
        if (!point) continue

        const pointFolder = folder.addFolder(`Point ${i + 1}`)
        pointFolder.add(point, "x", -2, 2, 0.01).name("X").onFinishChange(rebuildMesh)
        pointFolder.add(point, "y", -2, 2, 0.01).name("Y").onFinishChange(rebuildMesh)
      }
      break
    }
    case "Prism": {
      const builder = /** @type {PrismMeshBuilder} */ (meshBuilder)
      folder.add(builder, "sides", 3, 12, 1).name("Sides").onFinishChange(rebuildMesh)
      folder.add(builder, "radius", 0, 2, 0.01).name("Radius").onFinishChange(rebuildMesh)
      folder.add(builder, "rotation", 0, Math.PI * 2, 0.01).name("Rotation").onFinishChange(rebuildMesh)
      break
    }
    case "Wedge": {
      const builder = /** @type {WedgeMeshBuilder} */ (meshBuilder)
      folder.add(builder, "width", 0, 4, 0.01).name("Width").onFinishChange(rebuildMesh)
      folder.add(builder, "height", 0, 4, 0.01).name("Height").onFinishChange(rebuildMesh)
      break
    }
  }
}

updateBuilderProperties()

addRenderGraphGuiAddon({
  gui: controls,
  renderer
})

// Stats

const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")

function updateStats() {
  stats.update()
  requestAnimationFrame(updateStats)
}

requestAnimationFrame(updateStats)
