import { Shader, WebGLRenderDevice } from "../../../core/index.js"
import { Attribute } from "../../../mesh/index.js"
import { assert } from "../../../utils/index.js"
import { Camera, MeshMaterial2D, MeshMaterial3D } from "../../../objects/index.js"
import { MeshInstanceUniform, MeshRenderItem, WebGLRenderer } from "../../../renderer/index.js"
import { PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { BoneTextureResource, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from "../resources/index.js"

export const MeshKey = /** @type {const} */ ({
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
  MorphTargets: 1n << 8n,
  Dimension2D: 1n << 9n
})

/**
 * @param {import("../../../index.js").Mesh} mesh
 */
function keyFromTopology(mesh) {
  if (mesh.topology === PrimitiveTopology.Points) return MeshKey.Points
  if (mesh.topology === PrimitiveTopology.Lines) return MeshKey.Lines
  if (mesh.topology === PrimitiveTopology.LineLoop) return MeshKey.LineLoop
  if (mesh.topology === PrimitiveTopology.LineStrip) return MeshKey.LineStrip
  if (mesh.topology === PrimitiveTopology.Triangles) return MeshKey.Triangles
  if (mesh.topology === PrimitiveTopology.TriangleStrip) return MeshKey.TriangleStrip
  if (mesh.topology === PrimitiveTopology.TriangleFan) return MeshKey.TriangleFan
  return MeshKey.Triangles
}

/**
 * @param {import("../../../index.js").Mesh} mesh
 * @param {MeshMaterial2D | MeshMaterial3D} object
 */
function createPipelineBitsFromMesh(mesh, object) {
  const is2D = object instanceof MeshMaterial2D
  let key = keyFromTopology(mesh)
  if (is2D) key |= MeshKey.Dimension2D
  if (
    object instanceof MeshMaterial3D &&
    mesh.attributes.has(Attribute.JointIndex.name) &&
    mesh.attributes.has(Attribute.JointWeight.name) &&
    object.skin &&
    object.skin.bones.length > 0
  ) {
    key |= MeshKey.Skinned
  }
  if (!is2D && mesh.morphTargets.length > 0) key |= MeshKey.MorphTargets
  return key
}

/**
 * @param {import("../../../index.js").MeshVertexLayout} meshLayout
 * @param {bigint} meshBits
 * @param {Map<string, string>} globalDefines
 * @returns {[string, string][]}
 */
function getShaderDefs(meshLayout, meshBits, globalDefines) {
  /**@type {[string, string][]} */
  const shaderdefs = []
  if (meshBits & MeshKey.Dimension2D) shaderdefs.push(["DIMENSION_2D", ""])
  if (meshBits & MeshKey.Skinned) shaderdefs.push(["SKINNED", ""])
  if (meshLayout.hasAttribute(Attribute.UV)) shaderdefs.push(["VERTEX_UVS", ""])
  if (meshLayout.hasAttribute(Attribute.Color)) shaderdefs.push(["VERTEX_COLORS", ""])
  if (meshLayout.hasAttribute(Attribute.Normal)) shaderdefs.push(["VERTEX_NORMALS", ""])
  if (meshLayout.hasAttribute(Attribute.Tangent)) shaderdefs.push(["VERTEX_TANGENTS", ""])
  if (meshBits & MeshKey.MorphTargets) shaderdefs.push(["MORPH_TARGETS", ""])
  for (const [name, value] of globalDefines) shaderdefs.push([name, value])
  return shaderdefs
}

export const GeneralPipelineKeyShiftBits = /** @type {const} */ ({
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
  return BigInt(layoutHash) << GeneralPipelineKeyShiftBits.LayoutHashBits |
    meshBits << GeneralPipelineKeyShiftBits.MeshBits |
    materialBits << GeneralPipelineKeyShiftBits.MaterialBits
}

/**
 * @param {{
 *   object: MeshMaterial2D | MeshMaterial3D,
 *   device: WebGLRenderDevice,
 *   renderer: WebGLRenderer,
 *   pipelines: MeshMaterialPipelines,
 *   camera: Camera,
 *   boneTexture: BoneTextureResource,
 *   materialBindGroups: MeshMaterialBindGroups,
 *   materials: MeshMaterials,
 *   meshInstanceBindGroups: import("../../../renderer/index.js").MeshInstanceBindGroups,
 *   morphTargetTextures: MorphTargetTextures,
 *   viewBindGroups: import("../../../renderer/index.js").ViewBindGroups
 * }} options
 * @returns {MeshRenderItem | undefined}
 */
export function createMeshMaterialRenderItem({
  object,
  device,
  renderer,
  pipelines,
  camera,
  boneTexture,
  materialBindGroups,
  materials,
  meshInstanceBindGroups,
  morphTargetTextures,
  viewBindGroups
}) {
  if (!(object instanceof MeshMaterial2D) && !(object instanceof MeshMaterial3D)) return

  const { caches, attributes } = renderer
  const { material, mesh } = object
  const positionAttribute = object instanceof MeshMaterial2D ? Attribute.Position2D : Attribute.Position3D
  if (!mesh.attributes.has(positionAttribute.name)) {
    console.warn(`${object.constructor.name} requires a mesh with a ${positionAttribute.name} attribute; skipping render item`)
    return
  }
  let skinTextureState
  if (object instanceof MeshMaterial3D && object.skin) {
    skinTextureState = { resource: boneTexture, slot: boneTexture.getOrAllocate(object.skin) }
  }
  let morphTextureState
  if (object instanceof MeshMaterial3D && mesh.morphTargets.length > 0) {
    morphTextureState = morphTargetTextures.getOrAllocate(mesh)
  }
  materials.add(material)

  const viewBindGroup = viewBindGroups.getOrSet(device, camera)
  const materialBindGroupLayout = materialBindGroups.getLayout(material)
  if (!materialBindGroupLayout || !viewBindGroup.layout) return

  const viewBindGroupLayout = viewBindGroup.layout
  const gpuMesh = caches.getMesh(device, mesh, attributes)
  const meshBits = createPipelineBitsFromMesh(mesh, object)
  const pipelineKey = createPipelineKey(gpuMesh.layoutHash, meshBits, material.getPipelineBits())
  const materialName = material.constructor.name
  const pipelineId = pipelines.getOrSetCompute(materialName, pipelineKey, () => {
    const keyMeshBits = pipelineKey >> GeneralPipelineKeyShiftBits.MeshBits
    const meshLayout = caches.getMeshVertexLayout(gpuMesh.layoutHash)
    const { defines, includes } = renderer
    assert(meshLayout, "Mesh layout not available")
    const shaderdefs = getShaderDefs(meshLayout, keyMeshBits, defines)
    const vertexShader = new Shader({ source: material.vertex(), defines: new Map(defines), includes: new Map(includes) })
    const fragmentShader = new Shader({ source: material.fragment(), defines: new Map(defines), includes: new Map(includes) })
    for (const [name, value] of shaderdefs) {
      vertexShader.defines.set(name, value)
      fragmentShader.defines.set(name, value)
    }
    const descriptor = {
      topology: mesh.topology,
      vertexLayout: meshLayout,
      vertex: vertexShader,
      fragment: { source: fragmentShader, targets: [{ format: TextureFormat.RGBA8Unorm }] }
    }
    material.specialize(descriptor)
    let morphTargetBindGroupLayout
    if (keyMeshBits & MeshKey.MorphTargets) {
      morphTargetBindGroupLayout = morphTargetTextures.getBindGroupLayout(device)
    }
    const pipelineDescriptor = {
      ...descriptor,
      layout: device.createPipelineLayout({ bindGroupLayouts: [
        viewBindGroupLayout,
        materialBindGroupLayout,
        meshInstanceBindGroups.getBindGroupLayout(device),
        ...(morphTargetBindGroupLayout ? [morphTargetBindGroupLayout] : [])
      ] }),
      vertex: device.createShaderModule({ code: descriptor.vertex.compile(), stage: "vertex" }),
      fragment: { ...descriptor.fragment, source: device.createShaderModule({ code: descriptor.fragment.source.compile(), stage: "fragment" }) }
    }
    const [, newId] = caches.createRenderPipeline(device, pipelineDescriptor)
    return newId
  })

  if (!caches.getRenderPipeline(pipelineId)) return
  const meshInstance = object instanceof MeshMaterial2D
    ? MeshInstanceUniform.from2D(object.transform.world, object.zIndex)
    : new MeshInstanceUniform({
      transform: object.transform.world,
      skinIndex: skinTextureState ? skinTextureState.slot.index : 0,
      boneCount: object.skin?.bones.length ?? 0,
      morphTargetCount: morphTextureState?.targetCount ?? 0,
      morphWeights: object.morphWeights
    })
  return new MeshRenderItem({
    material,
    morphBindGroup: morphTextureState && morphTargetTextures ? morphTargetTextures.getBindGroup(device, renderer, mesh) : undefined,
    mesh: gpuMesh,
    pipelineId,
    meshInstance,
    tag: object.constructor.name,
    transform: meshInstance.transform
  })
}
