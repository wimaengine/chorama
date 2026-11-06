import Stats from "stats.js"
import {
  Affine2,
  BasicMaterial,
  Bone2D,
  Camera,
  CameraPlugin,
  CanvasTarget,
  Color,
  CullFace,
  MeshMaterial2D,
  MeshMaterialPlugin,
  Object2D,
  OrthographicProjection,
  Skin,
  WebGLRenderDevice,
  WebGLRenderer,
  createMesh2dFromArrays
} from "chorama"

// This mesh is authored in the skeleton's bind pose. The middle column blends
// between both bones, while the outer columns are rigidly attached to one bone.
const mesh = createMesh2dFromArrays({
  positions: [
    0, -0.6,
    0, 0.6,
    2, -0.6,
    2, 0.6,
    4, -0.6,
    4, 0.6
  ],
  jointIndices: [
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 1, 0, 0,
    0, 1, 0, 0,
    1, 1, 1, 1,
    1, 1, 1, 1
  ],
  jointWeights: [
    1, 0, 0, 0,
    1, 0, 0, 0,
    0.5, 0.5, 0, 0,
    0.5, 0.5, 0, 0,
    1, 0, 0, 0,
    1, 0, 0, 0
  ],
  indices: [
    0, 2, 1,
    1, 2, 3,
    2, 4, 3,
    3, 4, 5
  ]
})

const root = new Object2D()
root.name = "Skinned 2D Mesh"

const rootBone = new Bone2D()
rootBone.name = "root"
rootBone.index = 0

const tipBone = new Bone2D()
tipBone.name = "tip"
tipBone.index = 1
tipBone.transform.position.x = 2
rootBone.add(tipBone)
root.add(rootBone)

const skin = /** @type {import("chorama").Skin2D} */ (new Skin(new Affine2()))
skin.bones = [rootBone, tipBone]

const material = new BasicMaterial({
  color: new Color(0.15, 0.65, 1, 1)
})
material.cullFace = CullFace.None

const object = new MeshMaterial2D(mesh, material)
object.name = "Ribbon"
object.skin = skin
root.add(object)

// Capture the inverse bind pose after the bone hierarchy has been updated.
root.traverseDFS((child) => {
  if (child instanceof Object2D) {
    child.update()
  }
  return true
})
skin.setBindPose()

const canvas = document.createElement("canvas")
const renderTarget = new CanvasTarget(canvas)
const renderDevice = new WebGLRenderDevice(canvas, {
  depth: true
})
const renderer = new WebGLRenderer({
  renderDevice,
  plugins: [
    new CameraPlugin(),
    new MeshMaterialPlugin()
  ]
})

const camera = new Camera(renderTarget)
const projection = new OrthographicProjection()
camera.projection = projection
camera.transform.position.x = 2
camera.transform.position.z = 5

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

/** @param {number} now */
function update(now) {
  const angle = Math.sin(now / 700) * 0.8
  tipBone.transform.rotation.set(Math.cos(angle), Math.sin(angle))

  stats.begin()
  renderer.render([root, camera], renderDevice)
  stats.end()
  requestAnimationFrame(update)
}

function updateView() {
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio

  const viewHeight = 5
  const viewWidth = viewHeight * innerWidth / Math.max(innerHeight, 1)
  projection.left = -viewWidth * 0.5
  projection.right = viewWidth * 0.5
  projection.top = viewHeight * 0.5
  projection.bottom = -viewHeight * 0.5
}

const stats = new Stats()
stats.showPanel(1)
document.body.append(stats.dom)
stats.dom.removeAttribute("style")
stats.dom.classList.add("performance-monitor")
