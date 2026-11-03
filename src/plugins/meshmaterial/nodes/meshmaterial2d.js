import { assert } from "../../../utils/index.js"
import { Camera, MeshMaterial2D } from "../../../objects/index.js"
import { AlphaMaskMode, TransparentMode } from "../../../material/index.js"
import { MeshInstanceBindGroups, ViewBindGroups, Views } from "../../../renderer/index.js"
import { BoneTextureResource, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from "../resources/index.js"
import { createMeshMaterialRenderItem } from "./utils.js"

export class MeshMaterial2DNode {
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
    const materials = renderer.getResource(MeshMaterials)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const materialBindGroups = renderer.getResource(MeshMaterialBindGroups)
    const morphTargetTextures = renderer.getResource(MorphTargetTextures)

    assert(views, "Views resource missing")
    assert(pipelines, "MeshMaterialPipelines resource missing")
    assert(boneTexture, "BoneTextureResource missing")
    assert(materials, "MeshMaterials resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(materialBindGroups, "MeshMaterialBindGroups resource missing")
    assert(morphTargetTextures, "MorphTargetTextures resource missing")

    for (const view of views.items()) {
      if (!(view.object instanceof Camera)) {
        continue
      }

      const camera = view.object

      for (let i = 0; i < objects.length; i++) {
        const object = /** @type {import("../../../objects/index.js").ObjectBase} */ (objects[i])

        object.traverseDFS((child) => {
          if (!(child instanceof MeshMaterial2D)) {
            return true
          }

          if (!child.visible || !child.renderMask.test(view.renderMask)) {
            return true
          }

          const item = createMeshMaterialRenderItem({
            object: child,
            device: renderDevice,
            renderer,
            pipelines,
            camera,
            boneTexture,
            materialBindGroups,
            materials,
            meshInstanceBindGroups,
            morphTargetTextures,
            viewBindGroups
          })

          if (item) {
            const alphaBlendMode = child.material.alphaBlendMode()

            if (alphaBlendMode instanceof AlphaMaskMode) {
              view.alphaMask2D.add(item)
            } else if (alphaBlendMode instanceof TransparentMode) {
              view.transparent2D.add(item)
            } else {
              view.opaque2D.add(item)
            }
          }

          return true
        })
      }
    }
  }
}
