/**@import { Brand } from '../../utils/index.js' */
import { assert } from '../../utils/index.js'
import { MeshVertexLayout, Shader, WebGLRenderDevice } from "../../core/index.js";
import { Mesh, Attribute } from "../../mesh/index.js";
import { MeshMaterial3D, Object3D } from "../../objects/index.js";
import { Plugin, MeshRenderItem, SortViewsNode, WebGLRenderer, MeshInstanceBindGroups, MeshInstanceUniform, ViewBindGroups } from "../../renderer/index.js";
import { PrimitiveTopology, TextureFormat } from '../../constants/index.js';
import { CameraViewNode } from '../camera/index.js';
import { MeshMaterialNode, PrepareMaterialBindGroupsNode } from './nodes/index.js';
import { BoneTextureResource, EnvironmentMap, MaterialUniforms, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from './resources/index.js';

export class MeshMaterialPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new MeshMaterialPipelines())
    renderer.setResource(new MaterialUniforms())
    renderer.setResource(new MeshMaterials())
    renderer.setResource(new MeshMaterialBindGroups())
    renderer.setResource(new EnvironmentMap())
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(renderDevice.limits))
    }
    renderer.setResource(new MorphTargetTextures(renderDevice.limits))
    renderer.renderGraph.addNode(MeshMaterialNode.name, new MeshMaterialNode())
    renderer.renderGraph.addNode(PrepareMaterialBindGroupsNode.name, new PrepareMaterialBindGroupsNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, MeshMaterialNode.name)
    renderer.renderGraph.addDependency(MeshMaterialNode.name, PrepareMaterialBindGroupsNode.name)
    renderer.renderGraph.addDependency(PrepareMaterialBindGroupsNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(MeshMaterialNode.name, SortViewsNode.name)
  }
}

/**
 * @param {Object3D} object
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {MeshMaterialPipelines} pipelines
 * @param {import("../../renderer/index.js").View} view
 * @returns {MeshRenderItem | undefined}
 */
export function createMeshMaterialRenderItem(object, device, renderer, pipelines, view) {
  if (!(object instanceof MeshMaterial3D)) {
    return
  }

  const { caches, attributes } = renderer
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  const viewBindGroups = renderer.getResource(ViewBindGroups)
  const materialBindGroups = renderer.getResource(MeshMaterialBindGroups)
  const morphTargetTextures = renderer.getResource(MorphTargetTextures)
  const { material, mesh, transform } = object
  const materials = renderer.getResource(MeshMaterials)
  const skinTextureState = object.skin ? getSkinTextureState(renderer, object.skin) : undefined
  const morphTextureState = mesh.morphTargets.length > 0
    ? getMorphTextureState(morphTargetTextures, mesh)
    : undefined
  const viewObject = view.object

  assert(viewObject, "View object missing")
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  assert(viewBindGroups, "ViewBindGroups resource missing")
  assert(materialBindGroups, "MeshMaterialBindGroups resource missing")
  assert(materials, "MeshMaterials resource missing")
  materials.add(material)

  const viewBindGroup = viewBindGroups.getOrSet(device, viewObject)
  const materialBindGroupLayout = materialBindGroups.getLayout(material)

  // Material bind-group layouts are prepared by `PrepareMaterialBindGroupsNode`.
  // Material bind-group layouts are prepared asyncrounously too
  if (!materialBindGroupLayout || !viewBindGroup.layout) {
    return
  }

  const viewBindGroupLayout = viewBindGroup.layout
  const gpuMesh = caches.getMesh(device, mesh, attributes)
  const meshBits = createPipelineBitsFromMesh(mesh, object)
  const materialBits = material.getPipelineBits()
  const pipelineKey = createPipelineKey(gpuMesh.layoutHash, meshBits, materialBits)
  const materialName = material.constructor.name
  const pipelineId = pipelines.getOrSetCompute(materialName, pipelineKey, () => {
      const keyMeshBits = pipelineKey >> GeneralPipelineKeyShiftBits.MeshBits
      const meshLayout = caches.getMeshVertexLayout(gpuMesh.layoutHash)
      const { defines, includes } = renderer
      assert(meshLayout, "Mesh layout not available")
      const shaderdefs = getShaderDefs(meshLayout, keyMeshBits, defines)
      const vertexShader = new Shader({
        source: material.vertex(),
        defines: new Map(defines),
        includes: new Map(includes)
      })
      const fragmentShader = new Shader({
        source: material.fragment(),
        defines: new Map(defines),
        includes: new Map(includes)
      })

      for (const shaderdef of shaderdefs) {
        vertexShader.defines.set(shaderdef[0], shaderdef[1])
        fragmentShader.defines.set(shaderdef[0], shaderdef[1])
      }
      const descriptor = {
        topology: mesh.topology,
        vertexLayout: meshLayout,
        vertex: vertexShader,
        fragment: {
          source: fragmentShader,
          targets: [{
            format: TextureFormat.RGBA8Unorm
          }]
        }
      }

      material.specialize(descriptor)

      const pipelineDescriptor = {
        ...descriptor,
        layout: device.createPipelineLayout({
          bindGroupLayouts: [
            viewBindGroupLayout,
            materialBindGroupLayout,
            meshInstanceBindGroups.getBindGroupLayout(device),
            ...(keyMeshBits & MeshKey.MorphTargets
              ? [getMorphTargetBindGroupLayout(morphTargetTextures, device)]
              : [])
          ]
        }),
        vertex: device.createShaderModule({
          code: descriptor.vertex.compile(),
          stage: "vertex"
        }),
        fragment: descriptor.fragment
          ? {
              ...descriptor.fragment,
              source: device.createShaderModule({
                code: descriptor.fragment.source.compile(),
                stage: "fragment"
              })
            }
          : undefined
      }

      const [, newId] = caches.createRenderPipeline(device, pipelineDescriptor)
      return newId
  })

  const pipeline = caches.getRenderPipeline(pipelineId)
  if (!pipeline) {
    return
  }
  const meshInstance = new MeshInstanceUniform({
    transform: transform.world,
    skinIndex: skinTextureState ? skinTextureState.slot.index : 0,
    boneCount: object.skin?.bones.length ?? 0,
    morphTargetCount: morphTextureState?.targetCount ?? 0,
    morphWeights: object.morphWeights
  })

  const item = new MeshRenderItem({
    material,
    morphBindGroup: morphTextureState && morphTargetTextures
      ? morphTargetTextures.getBindGroup(device, renderer, mesh)
      : undefined,
    mesh: gpuMesh,
    pipelineId,
    meshInstance,
    tag: MeshMaterial3D.name,
    transform: transform.world
  })

  return item
}

/**
 * @param {MorphTargetTextures | undefined} morphTargetTextures
 * @param {WebGLRenderDevice} device
 */
function getMorphTargetBindGroupLayout(morphTargetTextures, device) {
  assert(morphTargetTextures, "MorphTargetTextures resource missing")
  return morphTargetTextures.getBindGroupLayout(device)
}

/**
 * @param {WebGLRenderer} renderer
 * @param {import("../../objects/index.js").Skin} skin
 */
function getSkinTextureState(renderer, skin) {
  const resource = renderer.getResource(BoneTextureResource)

  assert(resource, "BoneTextureResource missing")

  return {
    resource,
    slot: resource.getOrAllocate(skin)
  }
}

/**
 * @param {MorphTargetTextures | undefined} resource
 * @param {Mesh} mesh
 * @returns {import("./resources/morphtargettextures.js").MorphTargetTextureState | undefined}
 */
function getMorphTextureState(resource, mesh) {
  assert(resource, "MorphTargetTextures resource missing")
  return resource.getOrAllocate(mesh)
}

/**
 * @enum {bigint}
 */
export const MeshKey = /**@type {const}*/({
  TopologyBits: 0b1111111n,
  None: 0n,
  Points: 1n << 0n,
  Lines: 1n << 1n,
  LineLoop: 1n << 2n,
  LineStrip: 1n << 3n,
  Triangles: 1n << 4n,
  TriangleStrip: 1n << 5n,
  TriangleFan: 1n << 6n,
  Skinned: 1n << 7n,
  MorphTargets: 1n << 8n
})

/**
 * @param {Mesh} mesh
 * @returns {bigint}
 */
function keyFromTopology(mesh) {
  if (mesh.topology === PrimitiveTopology.Points) {
    return MeshKey.Points
  }
  if (mesh.topology === PrimitiveTopology.Lines) {
    return MeshKey.Lines
  }
  if (mesh.topology === PrimitiveTopology.LineLoop) {
    return MeshKey.LineLoop
  }
  if (mesh.topology === PrimitiveTopology.LineStrip) {
    return MeshKey.LineStrip
  }
  if (mesh.topology === PrimitiveTopology.Triangles) {
    return MeshKey.Triangles
  }
  if (mesh.topology === PrimitiveTopology.TriangleStrip) {
    return MeshKey.TriangleStrip
  }
  if (mesh.topology === PrimitiveTopology.TriangleFan) {
    return MeshKey.TriangleFan
  }

  return MeshKey.Triangles
}

/**
 * @param {Mesh} mesh
 * @param {MeshMaterial3D} object
 * @returns {bigint}
 */
function createPipelineBitsFromMesh(mesh, object) {
  let key = keyFromTopology(mesh)

  if (
    mesh.attributes.has(Attribute.JointIndex.name) &&
    mesh.attributes.has(Attribute.JointWeight.name) &&
    object.skin &&
    object.skin.bones.length > 0
  ) {
    key |= MeshKey.Skinned
  }
  if (mesh.morphTargets.length > 0) {
    key |= MeshKey.MorphTargets
  }
  return key
}

/**
 * @param {MeshVertexLayout} meshLayout
 * @param {bigint} meshBits
 * @param {ReadonlyMap<string, string>} globalDefines
 */
function getShaderDefs(meshLayout, meshBits, globalDefines) {
  /**@type {[string,string][]} */
  const shaderdefs = []
  if (meshBits & MeshKey.Skinned) {
    shaderdefs.push(["SKINNED", ""])
  }

  if (meshLayout.hasAttribute(Attribute.UV)) {
    shaderdefs.push(["VERTEX_UVS", ""])
  }

  if (meshLayout.hasAttribute(Attribute.Color)) {
    shaderdefs.push(["VERTEX_COLORS", ""])
  }

  if (meshLayout.hasAttribute(Attribute.Normal)) {
    shaderdefs.push(["VERTEX_NORMALS", ""])
  }

  if (meshLayout.hasAttribute(Attribute.Tangent)) {
    shaderdefs.push(["VERTEX_TANGENTS", ""])
  }

  if (meshBits & MeshKey.MorphTargets) {
    shaderdefs.push(["MORPH_TARGETS", ""])
  }

  for (const [name, value] of globalDefines) {
    shaderdefs.push([name, value])
  }

  return shaderdefs
}

/**
 * @enum {bigint}
 */
export const GeneralPipelineKeyShiftBits = /**@type {const}*/({
  LayoutHashBits: 0n,
  MeshBits: 15n,
  MaterialBits: 47n
})

/**
 * @param {number} layoutHash
 * @param {bigint} meshBits
 * @param {bigint} materialBits
 */
function createPipelineKey(layoutHash, meshBits, materialBits) {
  const layoutHashBits = BigInt(layoutHash)
  return /**@type {PipelineKey}*/(
    layoutHashBits << GeneralPipelineKeyShiftBits.LayoutHashBits |
    meshBits << GeneralPipelineKeyShiftBits.MeshBits |
    (materialBits << GeneralPipelineKeyShiftBits.MaterialBits)
  )
}

/**
 * @typedef {Brand<bigint,"PipelineKey">} PipelineKey
 */
