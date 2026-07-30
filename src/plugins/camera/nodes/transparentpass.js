import { Camera } from "../../../objects/index.js"
import { Views } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { CanvasTarget } from "../../../rendertarget/index.js"
import { CameraColorTargets } from "../resources/index.js"

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {CameraColorTargets} colorTargets
 */
function renderItems(view, device, renderer, colorTargets) {
  const transparentStage = view.transparent

  if (!(view.object instanceof Camera)) {
    throw "Camera transparent pass expects a camera view"
  }

  if (transparentStage.items.length === 0) {
    return
  }

  const camera = view.object
  const cameraColorTarget = colorTargets.get(camera)

  assert(cameraColorTarget, "Camera color target missing")

  const colorTarget = cameraColorTarget.target

  if (!colorTarget) {
    return
  }

  const caches = renderer.caches
  const width = camera.target instanceof CanvasTarget ? camera.target.canvas.width : camera.target.width
  const height = camera.target instanceof CanvasTarget ? camera.target.canvas.height : camera.target.height
  const depthTexture = cameraColorTarget.depthTexture ? caches.getTexture(device, cameraColorTarget.depthTexture) : undefined
  const depthStencilAttachment = depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
    texture: depthTexture,
    layer: cameraColorTarget.layer,
    depthLoadOp: "load",
    depthStoreOp: "store",
    depthReadOnly: true
  }) : undefined

  const pass = device.beginRenderPass({
    width,
    height,
    colorAttachments: [{
      texture: caches.getTexture(device, colorTarget),
      layer: cameraColorTarget.layer,
      loadOp: "load",
      storeOp: "store"
    }],
    depthStencilAttachment,
    viewport: camera.target.viewport,
    scissor: camera.target.scissor || camera.target.viewport
  })

  transparentStage.renderItems(pass, device.context, caches, view)
  pass.end()
}

export class CameraTransparentPassNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const colorTargets = renderer.getResource(CameraColorTargets)

    assert(views, "Views resource missing")
    assert(colorTargets, "Camera color targets resource missing")

    for (const view of views.items()) {
      if (view.tag !== Camera.name) {
        continue
      }

      renderItems(view, renderDevice, renderer, colorTargets)
    }
  }
}
