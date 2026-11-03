import { Shader, WebGLRenderDevice } from "../../../core/index.js"
import { Attribute } from "../../../mesh/index.js"
import { assert } from "../../../utils/index.js"
import { Camera, MeshMaterial3D, Object3D } from "../../../objects/index.js"
import { AlphaMaskMode, TransparentMode } from "../../../material/index.js"
import { MeshInstanceBindGroups, MeshInstanceUniform, MeshRenderItem, ViewBindGroups, Views, WebGLRenderer } from "../../../renderer/index.js"
import { PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { BoneTextureResource, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from "../resources/index.js"
import { containsFrustum } from "../../../math/index.js"

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
              view.alphaMask3D.add(item)
            } else if (alphaBlendMode instanceof TransparentMode) {
              view.transparent3D.add(item)
            } else {
              view.opaque3D.add(item)
            }
          }
          return true
        })
      }
    }
  }
}

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
  MorphTargets: 1n << 8n
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
 * @param {MeshMaterial3D} object
 */
function createPipelineBitsFromMesh(mesh, object) {
  let key = keyFromTopology(mesh)
  if (mesh.attributes.has(Attribute.JointIndex.name) && mesh.attributes.has(Attribute.JointWeight.name) && object.skin && object.skin.bones.length > 0) key |= MeshKey.Skinned
  if (mesh.morphTargets.length > 0) key |= MeshKey.MorphTargets
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
 *   object: Object3D,
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
  if (!(object instanceof MeshMaterial3D)) return

  const { caches, attributes } = renderer
  const { material, mesh, transform } = object
  let skinTextureState
  if (object.skin) {
    skinTextureState = { resource: boneTexture, slot: boneTexture.getOrAllocate(object.skin) }
  }
  let morphTextureState
  if (mesh.morphTargets.length > 0) {
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
  const meshInstance = new MeshInstanceUniform({
    transform: transform.world,
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
    tag: MeshMaterial3D.name,
    transform: transform.world
  })
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
