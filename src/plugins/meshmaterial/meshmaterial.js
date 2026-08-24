/**@import { Brand } from '../../utils/index.js' */
/**@import { WebGLRenderPipeline } from '../../core/index.js' */
import { assert } from '../../utils/index.js'
import { MeshVertexLayout, Shader, WebGLRenderDevice } from "../../core/index.js";
import { Mesh, Attribute } from "../../mesh/index.js";
import { MeshMaterial3D, Object3D } from "../../objects/index.js";
import { Plugin, RenderItem, ViewBindGroups, SortViewsNode, WebGLRenderer, MeshInstanceBindGroups, MeshInstanceUniform } from "../../renderer/index.js";
import { PrimitiveTopology, TextureFormat, TextureType } from '../../constants/index.js';
import { CameraViewNode } from '../camera/index.js';
import { MeshMaterialNode } from './nodes/index.js';
import { BoneTextureResource, EnvironmentMap, MaterialUniforms, MeshMaterialPipelines } from './resources/index.js';

export class MeshMaterialPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new MeshMaterialPipelines())
    renderer.setResource(new MaterialUniforms())
    renderer.setResource(new EnvironmentMap())
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(renderDevice.limits))
    }
    renderer.renderGraph.addNode(MeshMaterialNode.name, new MeshMaterialNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, MeshMaterialNode.name)
    renderer.renderGraph.addDependency(MeshMaterialNode.name, SortViewsNode.name)
  }
}

/**
 * @param {Object3D} object
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {MeshMaterialPipelines} pipelines
 * @param {import("../../renderer/index.js").View} view
 * @returns {RenderItem | undefined}
 */
export function createMeshMaterialRenderItem(object, device, renderer, pipelines, view) {
  if (!(object instanceof MeshMaterial3D)) {
    return
  }

  const { caches, attributes } = renderer
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  const { material, mesh, transform } = object
  const skinTextureState = object.skin ? getSkinTextureState(renderer, object.skin) : undefined
  const viewObject = view.object

  assert(viewObject, "View object missing")
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")

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
      const pipeline = caches.getRenderPipeline(newId)

      assert(pipeline, "Mesh material pipeline missing")
      if (!pipeline.layout.getBindGroupLayout(2)) {
        pipeline.layout.setBindGroupLayout(2, meshInstanceBindGroups.getBindGroupLayout(device))
      }


      return newId
  })

  const pipeline = caches.getRenderPipeline(pipelineId)
  if (pipeline && !pipeline.layout.getBindGroupLayout(2)) {
    pipeline.layout.setBindGroupLayout(2, meshInstanceBindGroups.getBindGroupLayout(device))
  }
  const materialBindGroup = pipeline ? createMaterialBindGroup(device, renderer, pipeline, material, view) : undefined
  const meshInstance = new MeshInstanceUniform({
    transform: transform.world,
    skinIndex: skinTextureState ? skinTextureState.slot.index : 0,
    boneCount: object.skin?.bones.length ?? 0
  })

  const item = new RenderItem({
    bindGroup: materialBindGroup,
    mesh: gpuMesh,
    pipelineId,
    meshInstance,
    tag: MeshMaterial3D.name,
    transform: transform.world
  })

  return item
}

/**
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {WebGLRenderPipeline} pipeline
 * @param {import("../../material/index.js").RawMaterial} material
 * @param {import("../../renderer/index.js").View} view
 * @returns {import("../../core/index.js").WebGLBindGroup | undefined}
 */
function createMaterialBindGroup(device, renderer, pipeline, material, view) {
  const { caches, defaults } = renderer
  const materialUniforms = renderer.getResource(MaterialUniforms)
  const viewBindGroups = renderer.getResource(ViewBindGroups)
  /**
   * @type {Array<{
   *   binding: number,
   *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
   *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
   * }>}
   */
  const bindings = []
  const materialBlockLayout = pipeline.uniformBlocks.get("MaterialBlock")
  let binding = 0

  assert(materialUniforms, "MaterialUniforms resource missing")
  assert(viewBindGroups, "ViewBindGroups resource missing")

  const viewObject = view.object

  assert(viewObject, "View object missing")
  const viewBindGroup = viewBindGroups.getOrSet(device, viewObject)

  assert(viewBindGroup.layout, "View bind group layout missing")

  if (!pipeline.layout.getBindGroupLayout(0)) {
    pipeline.layout.setBindGroupLayout(0, viewBindGroup.layout)
  }

  if (materialBlockLayout) {
    const materialBuffer = materialUniforms.setData(
      material,
      material.getData(),
      materialBlockLayout.size
    )
    const gpuBuffer = caches.getUniformBuffer(device, materialBuffer)

    bindings.push(createBufferBinding(binding++, "MaterialBlock", gpuBuffer, materialBlockLayout.size))
  }

  for (const [name, _unusedBinding, texture, sampler] of material.getTextures()) {
    if (!hasActiveTextureUniform(pipeline, name)) {
      continue
    }

    const sourceTexture = texture ?? defaults.texture2D
    const gpuTexture = caches.getTexture(device, sourceTexture)
    const sourceSampler = sampler ?? defaults.textureSampler
    const gpuSampler = caches.getSampler(device, sourceSampler)

    bindings.push(...createTextureSamplerBindings(
      binding,
      name,
      gpuTexture,
      gpuSampler,
      sourceTexture.type,
      sourceTexture.format
    ))
    binding += 2
  }

  if (bindings.length === 0) {
    return undefined
  }

  let bindGroupLayout = pipeline.layout.getBindGroupLayout(1)

  if (!bindGroupLayout) {
    bindGroupLayout = device.createBindGroupLayout({
      label: `${material.constructor.name}BindGroupLayout`,
      entries: bindings.map((binding) => binding.layout)
    })
    pipeline.layout.setBindGroupLayout(1, bindGroupLayout)
  }

  return device.createBindGroup({
    label: `${material.constructor.name}BindGroup`,
    layout: bindGroupLayout,
    entries: bindings.map((binding) => binding.entry)
  })
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
 * @param {number} binding
 * @param {string} name
 * @param {import("../../core/resources/index.js").GPUBuffer} buffer
 * @param {number} minBindingSize
 * @returns {{
 *   binding: number,
 *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
 *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
 * }}
 */
function createBufferBinding(binding, name, buffer, minBindingSize) {
  return {
    binding,
    layout: {
      binding,
      name,
      visibility: 0,
      buffer: {
        type: /** @type {"uniform"} */ ("uniform"),
        minBindingSize
      }
    },
    entry: {
      binding,
      resource: {
        buffer
      }
    }
  }
}

/**
 * @param {number} binding
 * @param {string} name
 * @param {import("../../core/resources/index.js").GPUTexture} texture
 * @param {TextureType} type
 * @param {TextureFormat} format
 * @returns {{
 *   binding: number,
 *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
 *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
 * }}
 */
function createTextureBinding(binding, name, texture, type, format) {
  return {
    binding,
    layout: {
      binding,
      name,
      visibility: 0,
      texture: {
        viewDimension: textureViewDimensionFromType(type),
        sampleType: textureSampleTypeFromFormat(format)
      }
    },
    entry: {
      binding,
      resource: {
        texture
      }
    }
  }
}

/**
 * @param {number} binding
 * @param {string} name
 * @param {import("../../core/resources/index.js").GPUSampler} sampler
 * @returns {{
 *   binding: number,
 *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
 *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
 * }}
 */
function createSamplerBinding(binding, name, sampler) {
  return {
    binding,
    layout: {
      binding,
      name,
      visibility: 0,
      sampler: {
        type: sampler.type
      }
    },
    entry: {
      binding,
      resource: {
        sampler
      }
    }
  }
}

/**
 * @param {number} binding
 * @param {string} name
 * @param {import("../../core/resources/index.js").GPUTexture} texture
 * @param {import("../../core/resources/index.js").GPUSampler} sampler
 * @param {TextureType} type
 * @param {TextureFormat} format
 */
function createTextureSamplerBindings(binding, name, texture, sampler, type, format) {
  return [
    createTextureBinding(binding, name, texture, type, format),
    createSamplerBinding(binding + 1, name, sampler)
  ]
}

/**
 * @param {WebGLRenderPipeline} pipeline
 * @param {string} name
 */
function hasActiveTextureUniform(pipeline, name) {
  return pipeline.uniforms.get(name)?.texture_unit !== undefined
}

/**
 * @param {TextureType} type
 * @returns {"2d" | "2d-array" | "cube" | "3d"}
 */
function textureViewDimensionFromType(type) {
  switch (type) {
    case TextureType.Texture2DArray:
      return "2d-array"
    case TextureType.TextureCubeMap:
      return "cube"
    case TextureType.Texture3D:
      return "3d"
    default:
      return "2d"
  }
}

/**
 * @param {TextureFormat} format
 * @returns {"float" | "depth"}
 */
function textureSampleTypeFromFormat(format) {
  switch (format) {
    case TextureFormat.Depth16Unorm:
    case TextureFormat.Depth24Plus:
    case TextureFormat.Depth24PlusStencil8:
    case TextureFormat.Depth32Float:
    case TextureFormat.Depth32FloatStencil8:
      return "depth"
    default:
      return "float"
  }
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
  Skinned: 1n << 7n
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

  if (meshLayout.hasAttribute(Attribute.Normal)) {
    shaderdefs.push(["VERTEX_NORMALS", ""])
  }

  if (meshLayout.hasAttribute(Attribute.Tangent)) {
    shaderdefs.push(["VERTEX_TANGENTS", ""])
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
