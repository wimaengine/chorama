import { Views } from "../../../renderer/views.js"
import { assert } from "../../../utils/index.js"
import { SpriteInstanceBindGroups, SpriteInstancePhaseBindGroup } from "../resources/index.js"

export class PrepareSpriteInstanceBindGroupsNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)
    const caches = renderer.caches

    assert(views, "Views resource missing")
    assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")

    for (const view of views.items()) {
      const object = view.object

      if (!object) {
        continue
      }

      const entry = spriteInstanceBindGroups.getOrSet(object)
      prepareSpriteInstancePhaseBindGroupState(renderDevice, caches, spriteInstanceBindGroups, entry.opaque2D)
      prepareSpriteInstancePhaseBindGroupState(renderDevice, caches, spriteInstanceBindGroups, entry.alphaMask2D)
      prepareSpriteInstancePhaseBindGroupState(renderDevice, caches, spriteInstanceBindGroups, entry.transparent2D)
    }
  }
}

/**
 * Prepares a phase-local sprite-instance bind group before rendering starts.
 *
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../caches/index.js").Caches} caches
 * @param {SpriteInstanceBindGroups} spriteInstanceBindGroups
 * @param {SpriteInstancePhaseBindGroup} phaseState
 * @returns {boolean}
 */
export function prepareSpriteInstancePhaseBindGroupState(device, caches, spriteInstanceBindGroups, phaseState) {
  const instanceCount = phaseState.instances.length

  if (instanceCount === 0) {
    return false
  }

  phaseState.reserve(instanceCount)
  const bindGroupLayout = spriteInstanceBindGroups.getBindGroupLayout(device)

  for (let i = 0; i < instanceCount; i++) {
    const spriteInstance = phaseState.instances[i]

    assert(spriteInstance, "Sprite instance uniform missing")
    phaseState.setData(i, spriteInstance)
  }

  phaseState.getBindGroup(device, caches, bindGroupLayout)

  return true
}
