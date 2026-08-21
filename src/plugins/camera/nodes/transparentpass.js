import { Camera } from "../../../objects/index.js"
import { Views } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
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
  const renderTarget = view.renderTarget
  const cameraColorTarget = colorTargets.get(camera)

  assert(cameraColorTarget, "Camera color target missing")
  assert(renderTarget, "Camera render target missing")

  const colorTarget = cameraColorTarget.target

  if (!colorTarget) {
    return
  }

  const caches = renderer.caches
  const width = renderTarget.width
  const height = renderTarget.height
  const depthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined

  const pass = device.beginRenderPass({
    width,
    height,
    colorAttachments: [{
      texture: caches.getTexture(device, colorTarget),
      loadOp: "load",
      storeOp: "store"
    }],
    depthStencilAttachment: depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
      texture: depthTexture,
      depthLoadOp: "load",
      depthStoreOp: "store",
      depthReadOnly: true
    }) : undefined,
    viewport: camera.viewport,
    scissor: camera.scissor || camera.viewport,
    depthRange: camera.depthRange
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
