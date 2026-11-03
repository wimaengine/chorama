import { GUI } from "dat.gui"
import Stats from "stats.js"
import {
  addRenderGraphGuiAddon,
  BasicMaterial,
  Camera,
  CameraPlugin,
  CanvasTarget,
  CapsuleMeshBuilder,
  Circle3DMeshBuilder,
  ConeMeshBuilder,
  CuboidMeshBuilder,
  CylinderMeshBuilder,
  DodecahedronMeshBuilder,
  EllipsoidMeshBuilder,
  ExtrudeMeshBuilder,
  FrustumMeshBuilder,
  HelixMeshBuilder,
  IcosahedronMeshBuilder,
  IcosphereMeshBuilder,
  LatheMeshBuilder,
  MeshMaterial3D,
  MeshMaterialPlugin,
  OctahedronMeshBuilder,
  OrbitCameraControls,
  PolyhedronMeshBuilder,
  PerspectiveProjection,
  PlaneMeshBuilder,
  PrismMeshBuilder,
  PyramidMeshBuilder,
  RingMeshBuilder,
  TetrahedronMeshBuilder,
  TorusKnotMeshBuilder,
  TorusMeshBuilder,
  TubeMeshBuilder,
  Vector2,
  Vector3,
  WedgeMeshBuilder,
  WebGLRenderDevice,
  WebGLRenderer,
  WireframeBuilder,
  TerrainMeshBuilder,
  UVSphereMeshBuilder
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
const projection = new PerspectiveProjection()
camera.projection = projection
const cameraControls = new OrbitCameraControls(camera, canvas)
cameraControls.distance = 5
cameraControls.elevation = 0.3

const builder = new PlaneMeshBuilder()
const material = new BasicMaterial()
const object = new MeshMaterial3D(builder.build3d(), material)

document.body.append(canvas)
addEventListener("resize", updateView)
updateView()
requestAnimationFrame(update)

function update() {
  cameraControls.update()
  renderer.render([object, camera], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = innerWidth + "px"
  canvas.style.height = innerHeight + "px"
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
  projection.aspect = innerWidth / innerHeight
}

// GUI

/**
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
function sampleTerrainHeight(x, z) {
  return Math.sin(x * 2.5) * Math.cos(z * 2.5) * 0.7 + Math.sin((x + z) * 1.5) * 0.25
}

/** @type {Record<string, (x: number, z: number) => number>} */
const terrainHeightModes = {
  Hills: sampleTerrainHeight,
  Flat: () => 0,
  Ridges: (x, z) => Math.sin(x * 4) * 0.18 + Math.cos(z * 3) * 0.15
}

function createExtrudeBuilder() {
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

function createLatheBuilder() {
  const builder = new LatheMeshBuilder()
  builder.profile = [
    new Vector2(0, -0.65),
    new Vector2(0.34, -0.6),
    new Vector2(0.48, -0.2),
    new Vector2(0.4, 0.25),
    new Vector2(0.22, 0.58),
    new Vector2(0, 0.72)
  ]
  builder.segments = 24
  return builder
}

function createTubeBuilder() {
  const builder = new TubeMeshBuilder()
  builder.points = [
    new Vector3(0, -0.5, 0),
    new Vector3(0.3, -0.2, 0.2),
    new Vector3(0.5, 0.1, 0.55),
    new Vector3(0.25, 0.35, 0.9),
    new Vector3(-0.15, 0, 1.2),
    new Vector3(0.12, -0.3, 1.45)
  ]
  builder.radius = 0.07
  builder.radialSegments = 12
  return builder
}

function createPolyhedronBuilder() {
  const builder = new PolyhedronMeshBuilder()
  builder.vertices = [
    new Vector3(-1, -1, -1),
    new Vector3(1, -1, -1),
    new Vector3(1, 1, -1),
    new Vector3(-1, 1, -1),
    new Vector3(-1, -1, 1),
    new Vector3(1, -1, 1),
    new Vector3(1, 1, 1),
    new Vector3(-1, 1, 1)
  ]
  builder.faces = [
    [0, 1, 2, 3],
    [4, 7, 6, 5],
    [0, 4, 5, 1],
    [1, 5, 6, 2],
    [2, 6, 7, 3],
    [4, 0, 3, 7]
  ]
  return builder
}

const builderOptions = [
  { name: "Plane", create: () => new PlaneMeshBuilder() },
  { name: "Circle", create: () => new Circle3DMeshBuilder() },
  { name: "Ring", create: () => new RingMeshBuilder() },
  { name: "Extrude", create: createExtrudeBuilder },
  { name: "Prism", create: () => new PrismMeshBuilder() },
  { name: "Wedge", create: () => new WedgeMeshBuilder() },
  { name: "Capsule", create: () => new CapsuleMeshBuilder() },
  { name: "Cone", create: () => new ConeMeshBuilder() },
  { name: "Cuboid", create: () => new CuboidMeshBuilder() },
  { name: "Cylinder", create: () => new CylinderMeshBuilder() },
  { name: "Dodecahedron", create: () => new DodecahedronMeshBuilder() },
  { name: "Ellipsoid", create: () => new EllipsoidMeshBuilder() },
  { name: "Frustum", create: () => new FrustumMeshBuilder() },
  { name: "Helix", create: () => new HelixMeshBuilder() },
  { name: "Icosahedron", create: () => new IcosahedronMeshBuilder() },
  { name: "Icosphere", create: () => new IcosphereMeshBuilder() },
  { name: "Lathe", create: createLatheBuilder },
  { name: "Octahedron", create: () => new OctahedronMeshBuilder() },
  { name: "Polyhedron", create: createPolyhedronBuilder },
  { name: "Pyramid", create: () => new PyramidMeshBuilder() },
  { name: "Terrain", create: () => {
    const builder = new TerrainMeshBuilder()
    builder.width = 2
    builder.depth = 2
    builder.widthSegments = 24
    builder.depthSegments = 24
    builder.heightScale = 0.35
    builder.sampleHeight = terrainHeightModes["Hills"] ?? sampleTerrainHeight
    return builder
  } },
  { name: "Tetrahedron", create: () => new TetrahedronMeshBuilder() },
  { name: "Torus", create: () => new TorusMeshBuilder() },
  { name: "Torus Knot", create: () => new TorusKnotMeshBuilder() },
  { name: "Tube", create: createTubeBuilder },
  { name: "UV Sphere", create: () => new UVSphereMeshBuilder() }
]

let meshBuilder = createBuilder("Plane")

const settings = {
  builder: "Plane",
  wireframe: false,
  terrainPattern: "Hills"
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
    throw new Error(`Unknown 3D mesh builder: ${name}`)
  }
  return option.create()
}

function rebuildMesh() {
  const mesh = meshBuilder.build3d()
  object.mesh = settings.wireframe
    ? new WireframeBuilder(mesh).build3d()
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
  const builder = /** @type {Record<string, any>} */ (meshBuilder)
  addObjectProperties(folder, builder)

  for (const property of ["contour", "profile", "points", "vertices"]) {
    addVectorArrayProperties(folder, builder, property)
  }

  if (settings.builder === "Terrain") {
    folder
      .add(settings, "terrainPattern", Object.keys(terrainHeightModes))
      .name("Height Pattern")
      .onChange((name) => {
        const sampleHeight = terrainHeightModes[name]
        if (!sampleHeight) return

        builder["sampleHeight"] = sampleHeight
        rebuildMesh()
      })
  }
}

/**
 * @param {GUI} folder
 * @param {Record<string, any>} target
 */
function addObjectProperties(folder, target) {
  for (const [property, value] of Object.entries(target)) {
    if (typeof value === "number" || typeof value === "boolean") {
      folder.add(target, property).name(formatLabel(property)).onFinishChange(rebuildMesh)
      continue
    }

    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Set)) {
      const nestedFolder = folder.addFolder(formatLabel(property))
      addObjectProperties(nestedFolder, /** @type {Record<string, any>} */ (value))
    }
  }
}

/**
 * @param {GUI} folder
 * @param {Record<string, any>} target
 * @param {string} property
 */
function addVectorArrayProperties(folder, target, property) {
  const values = target[property]
  if (!Array.isArray(values) || values.length === 0) return

  const axes = ["x", "y", "z"].filter((axis) =>
    values.some((point) => point && typeof point[axis] === "number")
  )
  if (axes.length === 0) return

  const valuesFolder = folder.addFolder(formatLabel(property))
  for (let i = 0; i < values.length; i++) {
    const point = values[i]
    if (!point || typeof point !== "object") continue

    const pointFolder = valuesFolder.addFolder(`Point ${i + 1}`)
    for (const axis of axes) {
      if (typeof point[axis] !== "number") continue
      pointFolder.add(point, axis).name(axis.toUpperCase()).onFinishChange(rebuildMesh)
    }
  }
}

/**
 * @param {string} name
 * @returns {string}
 */
function formatLabel(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase())
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
