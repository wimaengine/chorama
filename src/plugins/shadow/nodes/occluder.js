import { assert } from "../../../utils/index.js"
import { PrimitiveTopology } from "../../../constants/index.js"
import { WebGLRenderDevice, GPUMesh, Shader } from "../../../core/index.js"
import { DirectionalLight, PointLight, SpotLight, MeshMaterial3D, Object3D } from "../../../objects/index.js"
import { Attribute } from "../../../mesh/index.js"
import { MeshRenderItem, ViewBindGroups, Views, MeshInstanceBindGroups, MeshInstanceUniform } from "../../../renderer/index.js"
import { WebGLRenderer } from "../../../renderer/index.js"
import { basicVertex } from "../../../shader/index.js"
import { ShadowPipelines } from "../resources/index.js"
import { BoneTextureResource, MorphTargetTextures } from "../../meshmaterial/resources/index.js"

export class ShadowOccluderNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice, objects } = context
    const { caches } = renderer
    const views = renderer.getResource(Views)
    const shadowPipelines = renderer.getResource(ShadowPipelines)
    const boneTexture = renderer.getResource(BoneTextureResource)
    const morphTargetTextures = renderer.getResource(MorphTargetTextures)
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)

    assert(views, "Views resource missing")
    assert(shadowPipelines, "ShadowPipelines resource missing")
    assert(boneTexture, "BoneTextureResource missing")
    assert(morphTargetTextures, "MorphTargetTextures resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")

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
      if (
        !(view.object instanceof DirectionalLight) &&
        !(view.object instanceof PointLight) &&
        !(view.object instanceof SpotLight)
      ) {
        continue
      }

      const camera = view.object
      const opaqueStage = view.opaque

      for (let i = 0; i < objects.length; i++) {
        const object = /** @type {Object3D} */ (objects[i])

        object.traverseDFS((child) => {
          if (!child.renderMask.test(view.renderMask)) {
            return true
          }

          if (!(child instanceof MeshMaterial3D)) {
            return true
          }

          const gpuMesh = caches.getMesh(renderDevice, child.mesh, renderer.attributes)
          const skinned = isSkinned(child)
          const morphed = child.mesh.morphTargets.length > 0
          const morphTextureState = morphed ? morphTargetTextures.getOrAllocate(child.mesh) : undefined
          const pipelineId = getRenderPipelineId(
            renderDevice,
            renderer,
            gpuMesh,
            shadowPipelines,
            skinned,
            morphed,
            morphTargetTextures,
            viewBindGroups,
            meshInstanceBindGroups,
            camera
          )
          const pipeline = caches.getRenderPipeline(pipelineId)

          if (!pipeline) {
            return true
          }

          const skinTextureState = child.skin ? boneTexture.getOrAllocate(child.skin) : undefined
          const meshInstance = new MeshInstanceUniform({
            transform: child.transform.world,
            skinIndex: skinTextureState ? skinTextureState.index : 0,
            boneCount: child.skin?.bones.length ?? 0,
            morphTargetCount: morphTextureState?.targetCount ?? 0,
            morphWeights: child.morphWeights
          })
          const item = new MeshRenderItem({
            pipelineId,
            meshInstance,
            morphBindGroup: morphTextureState
              ? morphTargetTextures.getBindGroup(renderDevice, renderer, child.mesh)
              : undefined,
            transform: child.transform.world,
            mesh: gpuMesh,
            tag: ""
          })

          opaqueStage.add(item)
          return true
        })
      }
    }
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {GPUMesh} mesh
 * @param {ShadowPipelines} pipelines
 * @param {boolean} skinned
 * @param {boolean} morphed
 * @param {MorphTargetTextures} morphTargetTextures
 * @param {import("../../../renderer/index.js").ViewBindGroups} viewBindGroups
 * @param {import("../../../renderer/index.js").MeshInstanceBindGroups} meshInstanceBindGroups
 * @param {Object3D} viewObject
 * @returns {number}
 */
function getRenderPipelineId(
  device,
  renderer,
  mesh,
  pipelines,
  skinned,
  morphed,
  morphTargetTextures,
  viewBindGroups,
  meshInstanceBindGroups,
  viewObject
) {
  const { caches, includes, defines: globalDefines } = renderer
  const pipelineKey = createShadowPipelineKey(mesh.layoutHash, skinned, morphed)
  const pipelineId = pipelines.get(pipelineKey)

  if (pipelineId !== undefined) {
    return pipelineId
  }

  const layout = caches.getMeshVertexLayout(mesh.layoutHash)

  assert(layout, "Invalid mesh layout")
  const viewBindGroup = viewBindGroups.getOrSet(device, viewObject)
  assert(viewBindGroup.layout, "View bind group layout missing")
  const vertexShader = new Shader({
    source: basicVertex,
    defines: new Map(globalDefines),
    includes: new Map(includes)
  })

  if (skinned) {
    vertexShader.defines.set("SKINNED", "")
  }
  if (morphed) {
    vertexShader.defines.set("MORPH_TARGETS", "")
  }

  /**
   * @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        viewBindGroup.layout,
        meshInstanceBindGroups.getBindGroupLayout(device),
        device.createBindGroupLayout({ entries: [] }),
        ...(morphed ? [morphTargetTextures.getBindGroupLayout(device)] : [])
      ]
    }),
    depthWrite: true,
    topology: PrimitiveTopology.Triangles,
    vertexLayout: layout,
    vertex: device.createShaderModule({
      code: vertexShader.compile(),
      stage: "vertex"
    })
  }
  const [, newId] = caches.createRenderPipeline(device, descriptor)

  pipelines.set(pipelineKey, newId)
  return newId
}

/**
 * @param {number} layoutHash
 * @param {boolean} skinned
 * @param {boolean} morphed
 * @returns {string}
 */
function createShadowPipelineKey(layoutHash, skinned, morphed) {
  return [layoutHash, skinned ? 1 : 0, morphed ? 1 : 0].join(":")
}

/**
 * @param {MeshMaterial3D} object
 * @returns {boolean}
 */
function isSkinned(object) {
  const meshLayout = object.mesh.attributes

  return Boolean(
    object.skin &&
    object.skin.bones.length > 0 &&
    meshLayout.has(Attribute.JointIndex.name) &&
    meshLayout.has(Attribute.JointWeight.name)
  )
}
