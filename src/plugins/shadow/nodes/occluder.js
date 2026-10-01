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

    assert(views, "Views resource missing")
    assert(shadowPipelines, "ShadowPipelines resource missing")
    assert(boneTexture, "BoneTextureResource missing")
    assert(morphTargetTextures, "MorphTargetTextures resource missing")

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
        view.tag !== DirectionalLight.name &&
        view.tag !== PointLight.name &&
        view.tag !== SpotLight.name
      ) {
        continue
      }

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
            view,
            skinned,
            morphed,
            morphTargetTextures
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
 * @param {import("../../../renderer/index.js").View} view
 * @param {boolean} skinned
 * @param {boolean} morphed
 * @param {MorphTargetTextures} morphTargetTextures
 * @returns {number}
 */
function getRenderPipelineId(
  device,
  renderer,
  mesh,
  pipelines,
  view,
  skinned,
  morphed,
  morphTargetTextures
) {
  const { caches, includes, defines: globalDefines } = renderer
  const sceneBindGroups = renderer.getResource(ViewBindGroups)
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  const pipelineKey = createShadowPipelineKey(mesh.layoutHash, skinned, morphed)
  const pipelineId = pipelines.get(pipelineKey)

  assert(sceneBindGroups, "SceneBindGroups resource missing")
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")

  if (pipelineId !== undefined) {
    const pipeline = caches.getRenderPipeline(pipelineId)

    assert(pipeline, "Shadow pipeline missing")
    if (!pipeline.layout.getBindGroupLayout(1)) {
      pipeline.layout.setBindGroupLayout(1, meshInstanceBindGroups.getBindGroupLayout(device))
    }
    if (morphed && !pipeline.layout.getBindGroupLayout(3)) {
      pipeline.layout.setBindGroupLayout(3, morphTargetTextures.getBindGroupLayout(device))
    }

    return pipelineId
  }

  const layout = caches.getMeshVertexLayout(mesh.layoutHash)

  assert(layout, "Invalid mesh layout")
  const object = view.object

  assert(object, "View object missing")
  const sceneBindGroup = sceneBindGroups.getOrSet(device, object)
  assert(sceneBindGroup.layout, "Scene bind group layout missing")
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
    depthWrite: true,
    topology: PrimitiveTopology.Triangles,
    vertexLayout: layout,
    vertex: device.createShaderModule({
      code: vertexShader.compile(),
      stage: "vertex"
    })
  }
  const [, newId] = caches.createRenderPipeline(device, descriptor)
  const pipeline = caches.getRenderPipeline(newId)

  assert(pipeline, "Shadow pipeline missing")
  pipeline.layout.setBindGroupLayout(0, sceneBindGroup.layout)
  pipeline.layout.setBindGroupLayout(1, meshInstanceBindGroups.getBindGroupLayout(device))
  if (morphed) {
    pipeline.layout.setBindGroupLayout(3, morphTargetTextures.getBindGroupLayout(device))
  }

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
