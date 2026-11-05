import {
  BoundingBox2D
} from "maumbo"
import {
  Camera,
  CameraPlugin,
  CanvasTarget,
  MeshMaterialPlugin,
  OrthographicProjection,
  PanCamera2DController,
  Sprite2D,
  SpritePlugin,
  TextureAtlas,
  TextureLoader,
  WebGLRenderDevice,
  WebGLRenderer
} from "chorama"

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
    new SpritePlugin()
  ]
})

const camera = new Camera(renderTarget)
const projection = new OrthographicProjection()
camera.projection = projection
camera.transform.position.z = 1
const cameraControls = new PanCamera2DController(camera)

const texture = new TextureLoader().load({
  paths: ["/sprite_sheets/wanderer/wanderer.png"],
  flipY: true
})
const atlas = createWandererAtlas()
const sprite = new Sprite2D(texture, atlas)
sprite.slice = 0
sprite.transform.position.set(0, 0)

document.body.append(canvas)
updateView()
addEventListener("resize", updateView)
requestAnimationFrame(update)

let elapsed = 0
let previousTime = 0

/**
 * @param {number} time
 */
function update(time) {
  elapsed += time - previousTime
  previousTime = time

  if (elapsed >= 80) {
    sprite.slice = ((sprite.slice ?? 0) + 1) % atlas.slices.length
    elapsed = 0
  }

  cameraControls.update()
  renderer.render([sprite, camera], renderDevice)
  requestAnimationFrame(update)
}

function updateView() {
  const { width, height } = renderTarget

  const viewHeight = 1024
  const viewWidth = viewHeight * width / height
  projection.left = -viewWidth * 0.5
  projection.right = viewWidth * 0.5
  projection.top = viewHeight * 0.5
  projection.bottom = -viewHeight * 0.5
}

/**
 * Builds normalized bottom-left atlas slices for the 8x8 Wanderer sheet.
 *
 * @returns {TextureAtlas}
 */
function createWandererAtlas() {
  const columns = 8
  const rows = 8
  const slices = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const minX = column / columns
      const maxX = (column + 1) / columns
      const minY = 1 - (row + 1) / rows
      const maxY = 1 - row / rows
      slices.push(new BoundingBox2D(minX, minY, maxX, maxY))
    }
  }

  return new TextureAtlas(slices)
}
