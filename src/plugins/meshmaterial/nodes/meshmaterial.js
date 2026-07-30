import { assert } from "../../../utils/index.js"
import { Camera, MeshMaterial3D, Object3D } from "../../../objects/index.js"
import { AlphaMaskMode, TransparentMode } from "../../../material/index.js"
import { Views } from "../../../renderer/index.js"
import { BoneTextureResource, MeshMaterialPipelines } from "../resources/index.js"
import { createMeshMaterialRenderItem } from "../meshmaterial.js"

export class MeshMaterialNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice, objects } = context
    const views = renderer.getResource(Views)
    const pipelines = renderer.getResource(MeshMaterialPipelines)
    const boneTexture = renderer.getResource(BoneTextureResource)

    assert(views, "Views resource missing")
    assert(pipelines, "MeshMaterialPipelines resource missing")
    assert(boneTexture, "BoneTextureResource missing")

    const collectedSkins = new Set()

    for (let i = 0; i < objects.length; i++) {
      const object = /** @type {Object3D} */ (objects[i])

      object.traverseDFS((child) => {
        if (
          !(child instanceof MeshMaterial3D) ||
          !child.skin ||
          child.skin.bones.length === 0 ||
          collectedSkins.has(child.skin)
        ) {
          return true
        }

        boneTexture.collect(child.skin)
        collectedSkins.add(child.skin)
        return true
      })
    }

    boneTexture.upload(renderDevice, renderer)

    for (const view of views.items()) {
      if (view.tag !== Camera.name) {
        continue
      }

      for (let i = 0; i < objects.length; i++) {
        // SAFETY: Asssume the list is dense
        const object = /**@type {Object3D}*/(objects[i])

        object.traverseDFS((child) => {
          if (!(child instanceof MeshMaterial3D)) {
            return true
          }

          if (!child.renderMask.test(view.renderMask)) {
            return true
          }

          const item = createMeshMaterialRenderItem(child, renderDevice, renderer, pipelines)

          if (item) {
            const alphaBlendMode = child.material.alphaBlendMode()

            if (alphaBlendMode instanceof AlphaMaskMode) {
              view.alphaMask.add(item)
            } else if (alphaBlendMode instanceof TransparentMode) {
              view.transparent.add(item)
            } else {
              view.opaque.add(item)
            }
          }
          return true
        })
      }
    }
  }
}
