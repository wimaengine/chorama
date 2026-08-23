import { Camera } from "../../../objects/index.js"
import { RenderItem, View, Views } from "../../../renderer/index.js"
import { ViewBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { Affine3 } from "../../../math/index.js"
import { snapUp } from "../../../math/index.js"
import { ImageRenderTarget } from "../../../rendertarget/index.js"
import { hasDepthComponent, hasStencilComponent } from "../../../constants/index.js"

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 */
function renderItems(view, viewIndex, device, renderer) {
  const { renderTarget, opaque: opaqueStage } = view

  const context = device.context
  const caches = renderer.caches
  const sceneBindGroups = renderer.getResource(ViewBindGroups)

  if (!(renderTarget instanceof ImageRenderTarget)) {
    throw "Shadow opaque pass expects an image render target"
  }

  const imageTarget = renderTarget

  imageTarget.changed()

  const clearColor = imageTarget.clearColor
  const clearValue = clearColor ? /** @type {const} */ ([clearColor.r, clearColor.g, clearColor.b, clearColor.a]) : undefined
  const depthTexture = imageTarget.depthTexture ? caches.getTexture(device, imageTarget.depthTexture) : undefined
  const depthStencilAttachment = depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
    texture: depthTexture,
    layer: imageTarget.layer
  }) : undefined

  if (depthTexture && depthStencilAttachment && hasDepthComponent(depthTexture.actualFormat)) {
    depthStencilAttachment.depthLoadOp = imageTarget.clearDepth !== undefined ? "clear" : "load"
    depthStencilAttachment.depthStoreOp = "store"
    depthStencilAttachment.depthClearValue = imageTarget.clearDepth
  }

  if (depthTexture && depthStencilAttachment && hasStencilComponent(depthTexture.actualFormat)) {
    depthStencilAttachment.stencilLoadOp = imageTarget.clearStencil !== undefined ? "clear" : "load"
    depthStencilAttachment.stencilStoreOp = "store"
    depthStencilAttachment.stencilClearValue = imageTarget.clearStencil
  }

  const pass = device.beginRenderPass({
    width: imageTarget.width,
    height: imageTarget.height,
    colorAttachments: imageTarget.color.map((texture) => texture ? {
      texture: caches.getTexture(device, texture),
      layer: imageTarget.layer,
      loadOp: clearValue ? "clear" : "load",
      storeOp: "store",
      clearValue
    } : null),
    depthStencilAttachment,
    viewport: imageTarget.viewport,
    scissor: imageTarget.scissor || imageTarget.viewport
  })

  assert(sceneBindGroups, "SceneBindGroups resource missing")
  const object = view.object

  assert(object, "View object missing")
  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)

  pass.setBindGroup(0, sceneBindGroups.getOrSet(device, object).createBindGroup(device, caches), [dynamicOffset])

  for (let i = 0; i < opaqueStage.items.length; i++) {
    // SAFETY: List is dense
    const { pipelineId, mesh, bindGroup, transform } = /**@type {RenderItem}*/(opaqueStage.items[i])
    const pipeline = caches.getRenderPipeline(pipelineId)

    if (!pipeline) {
      continue
    }

    const modelInfo = pipeline.uniforms.get("model")
    const transformMatrix = Affine3.toMatrix4(transform)

    pass.setPipeline(pipeline)

    if (modelInfo) {
      context.uniformMatrix4fv(modelInfo.location, false, new Float32Array(transformMatrix))
    }
    if (bindGroup) {
      pass.setBindGroup(1, bindGroup)
    }
    pass.draw(mesh)
  }
  pass.end()
}

export class ShadowOpaquePassNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)

    assert(views, "Views resource missing")

    const viewsItems = views.items()

    for (let i = 0; i < viewsItems.length; i++) {
      const view = /**@type {View}*/(viewsItems[i])

      if (view.tag === Camera.name) {
        continue
      }

      renderItems(view, i, renderDevice, renderer)
    }
  }
}
