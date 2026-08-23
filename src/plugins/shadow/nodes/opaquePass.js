import { Camera } from "../../../objects/index.js"
import { RenderItem, View, Views } from "../../../renderer/index.js"
import { ViewBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { Affine3 } from "../../../math/index.js"
import { snapUp } from "../../../math/index.js"
import { ShadowMap } from "../resources/index.js"

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 */
function renderItems(view, viewIndex, device, renderer) {
  const { opaque: opaqueStage } = view

  const context = device.context
  const caches = renderer.caches
  const sceneBindGroups = renderer.getResource(ViewBindGroups)
  const shadowMap = renderer.getResource(ShadowMap)

  assert(shadowMap, "Shadow map resource missing")

  const depthTexture = caches.getTexture(device, shadowMap.shadowAtlas)
  const depthStencilAttachment = depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
    texture: depthTexture,
    mipLevel: view.depthMipmapLevel,
    layer: view.depthLayer,
    depthLoadOp: "clear",
    depthStoreOp: "store",
    depthClearValue: 1
  }) : undefined

  const pass = device.beginRenderPass({
    width: shadowMap.shadowAtlas.width,
    height: shadowMap.shadowAtlas.height,
    colorAttachments: [],
    depthStencilAttachment,
    viewport: view.viewport,
    scissor: view.scissor || view.viewport
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
