import { Camera } from "../../../objects/index.js"
import { View, Views, ViewBindGroups, MeshInstanceBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { snapUp } from "../../../math/index.js"
import { ShadowMap } from "../resources/index.js"
import { MeshMaterialBindGroups } from "../../meshmaterial/resources/index.js"
import { getMipLevelSize } from "../../../core/webgl/utils.js"

const MESH_INSTANCE_BIND_GROUP_INDEX = 2

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {ViewBindGroups} viewBindGroups
 * @param {MeshInstanceBindGroups} meshInstanceBindGroups
 * @param {ShadowMap} shadowMap
 * @param {MeshMaterialBindGroups} materialBindGroups
 */
function renderItems(view, viewIndex, device, renderer, viewBindGroups, meshInstanceBindGroups, shadowMap, materialBindGroups) {
  if (!view.object || view.object instanceof Camera) {
    return
  }

  const object = view.object
  const { opaque3D: opaqueStage } = view
  const context = device.context
  const caches = renderer.caches
  const depthTexture = caches.getTexture(device, shadowMap.shadowAtlas)
  const depthStencilAttachment = depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
    texture: depthTexture,
    mipLevel: view.depthMipmapLevel,
    layer: view.depthLayer,
    depthLoadOp: "clear",
    depthStoreOp: "store",
    depthClearValue: 1
  }) : undefined

  const pass = device.createCommandEncoder().beginRenderPass({
    colorAttachments: [],
    depthStencilAttachment
  })

  const { width, height } = getMipLevelSize(
    depthTexture.type,
    depthTexture.width,
    depthTexture.height,
    depthTexture.depth,
    view.depthMipmapLevel
  )
  pass.setViewport(
    view.viewport.offset.x * width,
    view.viewport.offset.y * height,
    view.viewport.size.x * width,
    view.viewport.size.y * height
  )
  pass.setScissorRect(
    (view.scissor || view.viewport).offset.x * width,
    (view.scissor || view.viewport).offset.y * height,
    (view.scissor || view.viewport).size.x * width,
    (view.scissor || view.viewport).size.y * height
  )

  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)

  pass.setBindGroup(0, viewBindGroups.getOrSet(device, object).createBindGroup(device, caches), [dynamicOffset])

  const meshInstanceEntry = meshInstanceBindGroups.getOrSet(object)
  opaqueStage.renderItems(pass, context, caches, meshInstanceEntry.opaque3D, MESH_INSTANCE_BIND_GROUP_INDEX, view, materialBindGroups)
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
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const shadowMap = renderer.getResource(ShadowMap)
    const materialBindGroups = renderer.getResource(MeshMaterialBindGroups)

    assert(views, "Views resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
    assert(shadowMap, "Shadow map resource missing")
    assert(materialBindGroups, "MeshMaterialBindGroups resource missing")

    const viewsItems = views.items()

    for (let i = 0; i < viewsItems.length; i++) {
      const view = /**@type {View}*/(viewsItems[i])



      renderItems(view, i, renderDevice, renderer, viewBindGroups, meshInstanceBindGroups, shadowMap, materialBindGroups)
    }
  }
}
