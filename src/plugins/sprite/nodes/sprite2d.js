import { AlphaMaskMode, TransparentMode } from "../../../material/index.js"
import { Camera, Sprite2D } from "../../../objects/index.js"
import { NonMeshRenderItem, Views } from "../../../renderer/index.js"
import {
  SpriteInstanceBindGroups,
  SpriteInstanceUniform,
  resolveAlphaMaskSprite2DBindGroup,
  resolveOpaqueSprite2DBindGroup,
  resolveTransparentSprite2DBindGroup
} from "../resources/index.js"
import { assert } from "../../../utils/index.js"
import { SpriteBindGroups, SpritePipelines } from "../resources/index.js"

export class Sprite2dNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice, objects } = context
    const views = renderer.getResource(Views)
    const spriteBindGroups = renderer.getResource(SpriteBindGroups)
    const spritePipelines = renderer.getResource(SpritePipelines)
    const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)

    assert(views, "Views resource missing")
    assert(spriteBindGroups, "SpriteBindGroups resource missing")
    assert(spritePipelines, "SpritePipelines resource missing")
    assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")

    for (const view of views.items()) {
      if (!(view.object instanceof Camera)) {
        continue
      }

      const camera = view.object
      const spriteInstanceEntry = spriteInstanceBindGroups.getOrSet(camera)
      spriteInstanceEntry.clear()

      for (let i = 0; i < objects.length; i++) {
        const object = /** @type {import("../../../objects/index.js").ObjectBase} */ (objects[i])

        object.traverseDFS((child) => {
          if (!(child instanceof Sprite2D)) {
            return true
          }

          if (!child.visible || !child.renderMask.test(view.renderMask)) {
            return true
          }

          const alphaBlendMode = child.alphaBlendMode()
          const alphaCutoff = alphaBlendMode instanceof AlphaMaskMode
            ? alphaBlendMode.cutoff
            : 0.5
          const uvRect = child.uvRect
          const size = /** @type {[number, number]} */ (child.size === undefined
            ? [
              child.image.width * (uvRect[2] - uvRect[0]),
              child.image.height * (uvRect[3] - uvRect[1])
            ]
            : [child.size.x, child.size.y])
          const spriteInstance = SpriteInstanceUniform.from2D(
            child.transform.world,
            child.zIndex,
            uvRect,
            size,
            child.tint,
            alphaCutoff
          )
          const bindGroup = spriteBindGroups.getOrSet(renderDevice, renderer, child.image)

          if (alphaBlendMode instanceof AlphaMaskMode) {
            const pipelineId = spritePipelines.alphaMask
            if (pipelineId === undefined) {
              return true
            }

            const i = spriteInstanceEntry.alphaMask2D.add(spriteInstance)
            const item = new NonMeshRenderItem({
              pipelineId,
              tag: child.constructor.name,
              vertexCount: 6
            })
            item.bindings.set(1, bindGroup)
            item.bindings.set(2, resolveAlphaMaskSprite2DBindGroup, [spriteInstanceEntry.alphaMask2D.getOffset(i)])
            view.alphaMask2D.add(item)
          } else if (alphaBlendMode instanceof TransparentMode) {
            const pipelineId = spritePipelines.transparent
            if (pipelineId === undefined) {
              return true
            }

            const i = spriteInstanceEntry.transparent2D.add(spriteInstance)
            const item = new NonMeshRenderItem({
              pipelineId,
              tag: child.constructor.name,
              vertexCount: 6
            })
            item.bindings.set(1, bindGroup)
            item.bindings.set(2, resolveTransparentSprite2DBindGroup, [spriteInstanceEntry.transparent2D.getOffset(i)])
            view.transparent2D.add(item)
          } else {
            const pipelineId = spritePipelines.opaque
            if (pipelineId === undefined) {
              return true
            }

            const i = spriteInstanceEntry.opaque2D.add(spriteInstance)
            const item = new NonMeshRenderItem({
              pipelineId,
              tag: child.constructor.name,
              vertexCount: 6
            })
            item.bindings.set(1, bindGroup)
            item.bindings.set(2, resolveOpaqueSprite2DBindGroup, [spriteInstanceEntry.opaque2D.getOffset(i)])
            view.opaque2D.add(item)
          }

          return true
        })
      }
    }
  }
}
