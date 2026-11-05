import { assert } from "../../../utils/index.js"
import { Camera, MeshMaterial3D, Object3D } from "../../../objects/index.js"
import { AlphaMaskMode, TransparentMode } from "../../../material/index.js"
import {
  MeshInstanceBindGroups,
  ViewBindGroups,
  Views,
  resolveAlphaMask3DBindGroup,
  resolveTransparent3DBindGroup,
  resolveOpaque3DBindGroup
} from "../../../renderer/index.js"
import { BoneTextureResource, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from "../resources/index.js"
import { containsFrustum } from "../../../math/index.js"
import { createMeshMaterialRenderItem } from "./utils.js"

export { MeshKey, GeneralPipelineKeyShiftBits, createMeshMaterialRenderItem } from "./utils.js"

export class MeshMaterial3DNode {
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

    materials.clear()

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

    for (const view of views.items()) {
      if (!(view.object instanceof Camera)) {
        continue
      }

      const camera = view.object

      viewBindGroups.getOrSet(renderDevice, camera)
      const meshInstanceEntry = meshInstanceBindGroups.getOrSet(camera)
      meshInstanceEntry.clear()

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

          if (!isMeshVisible(child, view)) {
            return true
          }

          const renderItem = createMeshMaterialRenderItem({
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

          if (renderItem) {
            const { item, meshInstance } = renderItem
            const alphaBlendMode = child.material.alphaBlendMode()

            if (alphaBlendMode instanceof AlphaMaskMode) {
              const i = meshInstanceEntry.alphaMask3D.add(meshInstance)
              item.bindings.set(2, resolveAlphaMask3DBindGroup, [meshInstanceEntry.alphaMask3D.getOffset(i)])
              view.alphaMask3D.add(item)
            } else if (alphaBlendMode instanceof TransparentMode) {
              const i = meshInstanceEntry.transparent3D.add(meshInstance)
              item.bindings.set(2, resolveTransparent3DBindGroup, [meshInstanceEntry.transparent3D.getOffset(i)])
              view.transparent3D.add(item)
            } else {
              const i = meshInstanceEntry.opaque3D.add(meshInstance)
              item.bindings.set(2, resolveOpaque3DBindGroup, [meshInstanceEntry.opaque3D.getOffset(i)])
              view.opaque3D.add(item)
            }
          }
          return true
        })
      }
    }
  }
}

/**
 * Culls a mesh against the current camera view. Bounds are local to the mesh
 * and are transformed conservatively by the object's world transform.
 */
/** @param {MeshMaterial3D} object @param {import('../../../renderer/core/index.js').View} view */
function isMeshVisible(object, view) {
  const {mesh, skin } = object
  const {morphTargets, bounds } = mesh

  // Base vertex bounds are not safe for animated vertex positions.
  if (skin || morphTargets.length > 0) {
    return true
  }

  if (!bounds) return true

  const transform = object.transform.world

  return containsFrustum(view.frustum, bounds, transform)
}
