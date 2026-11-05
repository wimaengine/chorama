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
  TextureAtlasLayout,
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
  paths: ["/sprite_sheets/wanderer/wanderer.png"]
})
const layout = createWandererAtlas()
const atlas = new TextureAtlas(texture, layout)
const sprite = new Sprite2D([atlas])
sprite.atlasIndex = 0
sprite.sliceIndex = 0
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
    sprite.sliceIndex = (sprite.sliceIndex + 1) % layout.slices.length
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
 * Builds normalized top-left atlas slices for the 8x8 Wanderer sheet.
 *
 * @returns {TextureAtlasLayout}
 */
function createWandererAtlas() {
  const columns = 8
  const rows = 8
  const slices = []

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const minX = column / columns
      const maxX = (column + 1) / columns
      const minY = row / rows
      const maxY = (row + 1) / rows
      slices.push(new BoundingBox2D(minX, minY, maxX, maxY))
    }
  }

  return new TextureAtlasLayout(slices)
}
