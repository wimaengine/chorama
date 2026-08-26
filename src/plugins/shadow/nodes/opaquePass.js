import { Camera } from "../../../objects/index.js"
import { View, Views, ViewBindGroups, MeshInstanceBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { snapUp } from "../../../math/index.js"
import { ShadowMap } from "../resources/index.js"

const MESH_INSTANCE_BIND_GROUP_INDEX = 1

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
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
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

  const pass = device.createCommandEncoder().beginRenderPass({
    width: shadowMap.shadowAtlas.width,
    height: shadowMap.shadowAtlas.height,
    colorAttachments: [],
    depthStencilAttachment,
    viewport: view.viewport,
    scissor: view.scissor || view.viewport
  })

  assert(sceneBindGroups, "SceneBindGroups resource missing")
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  const object = view.object

  assert(object, "View object missing")
  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)

  pass.setBindGroup(0, sceneBindGroups.getOrSet(device, object).createBindGroup(device, caches), [dynamicOffset])

  const meshInstanceEntry = meshInstanceBindGroups.getOrSet(object)
  opaqueStage.renderItems(pass, context, caches, meshInstanceEntry.opaque, MESH_INSTANCE_BIND_GROUP_INDEX, view)
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
