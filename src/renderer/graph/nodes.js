/** @import { RenderGraphContext } from "./rendergraph.js" */
import { assert } from "../../utils/index.js"
import { View } from "../core/index.js"
import { Views } from "../views.js"
import { MeshInstanceBindGroups, MeshInstancePhaseBindGroup, ViewUniformBuffer } from "../resources/index.js"
import { snapUp } from "../../math/index.js"

export class SortViewsNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {RenderGraphContext} context
   */
  execute(context) {
    const { renderDevice, renderer } = context
    const views = renderer.getResource(Views)
    const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)

    assert(views, "Views resource missing")
    assert(viewUniformBuffer, "ViewUniformBuffer resource missing")

    const alignment = renderDevice.limits.minUniformBufferOffsetAlignment
    const sorted = views.items()
      .map((view, index) => ({ view, index }))
      .sort((a, b) => {
        const order = a.view.order - b.view.order

        if (order !== 0) {
          return order
        }

        return a.index - b.index
      })
      .map((entry) => entry.view)

    views.clear()
    views.push(...sorted)

    const orderedViews = views.items()
    const stride = snapUp(View.BlockSize, alignment)
    const data = new ArrayBuffer(orderedViews.length * stride)

    for (let i = 0; i < orderedViews.length; i++) {
      const view = /**@type {View}*/(orderedViews[i])
      const payload = view.getData()

      new Uint8Array(data, i * stride, stride).set(new Uint8Array(payload))
    }

    viewUniformBuffer.buffer.data = data
  }
}

export class PrepareMeshInstanceBindGroupsNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const caches = renderer.caches

    assert(views, "Views resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")

    const viewItems = views.items()

    for (let i = 0; i < viewItems.length; i++) {
      const view = /** @type {View} */ (viewItems[i])
      const object = view.object

      if (!object) {
        continue
      }

      const entry = meshInstanceBindGroups.getOrSet(object)

      prepareMeshInstancePhaseBindGroupState(renderDevice, caches, meshInstanceBindGroups, entry.opaque, view.opaque, view)
      prepareMeshInstancePhaseBindGroupState(renderDevice, caches, meshInstanceBindGroups, entry.alphaMask, view.alphaMask, view)
      prepareMeshInstancePhaseBindGroupState(renderDevice, caches, meshInstanceBindGroups, entry.transparent, view.transparent, view)
    }
  }
}


/**
 * Prepares a phase-local mesh-instance bind group before rendering starts.
 *
 * @param {import("../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../caches/index.js").Caches} caches
 * @param {MeshInstanceBindGroups} meshInstanceBindGroups
 * @param {MeshInstancePhaseBindGroup} phaseState
 * @param {import("../core/index.js").RenderStage} stage
 * @param {View} view
 * @returns {boolean}
 */
export function prepareMeshInstancePhaseBindGroupState(device, caches, meshInstanceBindGroups, phaseState, stage, view) {
  const meshItems = stage.getMeshItems(view)
  const instanceCount = meshItems.length

  if (instanceCount === 0) {
    return false
  }

  phaseState.reserve(instanceCount)
  const bindGroupLayout = meshInstanceBindGroups.getBindGroupLayout(device)

  for (let i = 0; i < meshItems.length; i++) {
    const item = /** @type {import("../core/index.js").RenderItem} */ (meshItems[i])
    const meshInstance = /** @type {import("../resources/meshinstanceuniform.js").MeshInstanceUniform} */ (item.meshInstance)

    phaseState.setData(i, meshInstance.getData())
  }

  phaseState.getBindGroup(device, caches, bindGroupLayout)
  return true
}
