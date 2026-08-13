/**@import { Brand } from '../../utils/index.js' */
/**@import { WebGLRenderPipeline, WebGLRenderPipelineDescriptor } from '../../core/index.js' */
import { assert } from '../../utils/index.js'
import { MeshVertexLayout, Shader, WebGLRenderDevice } from "../../core/index.js";
import { Mesh, Attribute } from "../../mesh/index.js";
import { AlphaMaskMode } from "../../material/index.js";
import { MeshMaterial3D, Object3D } from "../../objects/index.js";
import { Plugin, RenderItem, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import { PrimitiveTopology, TextureFormat, TextureType, UniformType } from '../../constants/index.js';
import { ShadowMap } from '../shadow/index.js';
import { CameraViewNode } from '../camera/index.js';
import { MeshMaterialNode } from './nodes/index.js';
import { BoneTextureResource, EnvironmentMap, MaterialUniformBuffers, MeshMaterialPipelines } from './resources/index.js';

/** @type {WeakMap<import("../../objects/index.js").Skin, import("../../caches/uniformbuffers.js").UniformBuffer>} */
const skinUniformBuffers = new WeakMap()
let skinUniformBufferId = 0

export class MeshMaterialPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.setResource(new MeshMaterialPipelines())
    renderer.setResource(new MaterialUniformBuffers())
    renderer.setResource(new EnvironmentMap())
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(
        renderer.limits.textures.maxTextureSize,
        renderer.limits.textures.maxArrayTextureLayers
      ))
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
 * @returns {RenderItem | undefined}
 */
export function createMeshMaterialRenderItem(object, device, renderer, pipelines) {
  if (!(object instanceof MeshMaterial3D)) {
    return
  }

  const { caches, attributes } = renderer
  const { material, mesh, transform } = object

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
      /**
       * @type {WebGLRenderPipelineDescriptor}
       */
      const descriptor = {
        topology: mesh.topology,
        vertexLayout: meshLayout,
        vertex: new Shader({
          source: material.vertex()
        }),
        fragment: {
          source: new Shader({
            source: material.fragment()
          }),
          targets: [{
            format: TextureFormat.RGBA8Unorm
          }]
        }
      }

      for (const shaderdef of shaderdefs) {
        descriptor.vertex.defines.set(shaderdef[0], shaderdef[1])
        descriptor.fragment?.source?.defines?.set(shaderdef[0], shaderdef[1])
      }
      for (const [name, value] of includes) {
        descriptor.vertex.includes.set(name, value)
        descriptor.fragment?.source?.includes?.set(name, value)
      }

      material.specialize(descriptor)

      const [_, newId] = caches.createRenderPipeline(device, descriptor)

      return newId
  })

  const pipeline = caches.getRenderPipeline(pipelineId)
  const bindGroup = pipeline ? createMaterialBindGroup(device, renderer, pipeline, material, object) : undefined
  const item = new RenderItem({
    bindGroup,
    mesh: gpuMesh,
    pipelineId,
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
 * @param {MeshMaterial3D} object
 * @returns {import("../../core/index.js").WebGLBindGroup | undefined}
 */
function createMaterialBindGroup(device, renderer, pipeline, material, object) {
  const { caches, defaults } = renderer
  const materialUniformBuffers = renderer.getResource(MaterialUniformBuffers)
  const environmentMap = renderer.getResource(EnvironmentMap)
  const skinTextureState = object.skin ? getSkinTextureState(renderer, object.skin) : undefined
  /**
   * @type {Array<{
   *   binding: number,
   *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
   *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
   * }>}
   */
  const bindings = []
  const materialBlockLayout = pipeline.uniformBlocks.get("MaterialBlock")
  const alphaBlendMode = material.alphaBlendMode()
  const skinBlockLayout = object.skin ? pipeline.uniformBlocks.get("SkinBlock") : undefined
  let binding = 0

  assert(materialUniformBuffers, "MaterialUniformBuffers resource missing")
  assert(environmentMap, "EnvironmentMap resource missing")

  if (materialBlockLayout) {
    const materialBuffer = materialUniformBuffers.setData(
      material,
      "materialBlock",
      material.getData(),
      materialBlockLayout.size
    )
    const gpuBuffer = caches.getNewUniformBuffer(device, materialBuffer)

    bindings.push(createBufferBinding(binding++, "MaterialBlock", gpuBuffer, materialBlockLayout.size))
  }

  if (alphaBlendMode instanceof AlphaMaskMode) {
    const alphaMaskBlockLayout = pipeline.uniformBlocks.get("AlphaMaskBlock")

    if (alphaMaskBlockLayout) {
      const alphaMaskBuffer = materialUniformBuffers.setData(
        material,
        "alphaMaskBlock",
        createAlphaMaskUniformData(alphaMaskBlockLayout, alphaBlendMode.cutoff),
        alphaMaskBlockLayout.size
      )
      const gpuBuffer = caches.getNewUniformBuffer(device, alphaMaskBuffer)

      bindings.push(createBufferBinding(binding++, "AlphaMaskBlock", gpuBuffer, alphaMaskBlockLayout.size))
    }
  }

  if (object.skin && skinBlockLayout && skinTextureState) {
    const skinBuffer = getSkinUniformBuffer(device, renderer, skinBlockLayout, object.skin)

    skinBuffer.update(
      device.context,
      createSkinUniformData(skinBlockLayout, skinTextureState.slot.index, object.skin.bones.length)
    )
    bindings.push(createBufferBinding(binding++, "SkinBlock", skinBuffer.buffer, skinBlockLayout.size))
  }

  for (const [name, _unusedBinding, texture, sampler] of material.getTextures()) {
    if (!hasActiveTextureUniform(pipeline, name)) {
      continue
    }

    const sourceTexture = texture ?? defaults.texture2D
    const gpuTexture = caches.getTexture(device, sourceTexture)

    bindings.push(createTextureBinding(
      binding++,
      name,
      gpuTexture,
      sampler ?? defaults.textureSampler,
      sourceTexture.type,
      sourceTexture.format
    ))
  }

  if (environmentMap && hasActiveTextureUniform(pipeline, "environment_map")) {
    const sourceTexture = environmentMap.texture ?? defaults.textureCube
    const gpuTexture = caches.getTexture(device, sourceTexture)

    bindings.push(createTextureBinding(
      binding++,
      "environment_map",
      gpuTexture,
      environmentMap.sampler ?? defaults.textureSampler,
      sourceTexture.type,
      sourceTexture.format
    ))
  }

  const shadowmap = renderer.getResource(ShadowMap)

  if (shadowmap && hasActiveTextureUniform(pipeline, "shadow_atlas")) {
    const gpuTexture = caches.getTexture(device, shadowmap.shadowAtlas)

    bindings.push(createTextureBinding(
      binding++,
      "shadow_atlas",
      gpuTexture,
      shadowmap.sampler,
      shadowmap.shadowAtlas.type,
      shadowmap.shadowAtlas.format
    ))
  }

  if (object.skin && skinTextureState && hasActiveTextureUniform(pipeline, "bone_transforms")) {
    const gpuTexture = caches.getTexture(device, skinTextureState.resource.texture)

    bindings.push(createTextureBinding(
      binding++,
      "bone_transforms",
      gpuTexture,
      defaults.textureSampler,
      skinTextureState.resource.texture.type,
      skinTextureState.resource.texture.format
    ))
  }

  if (bindings.length === 0) {
    return undefined
  }

  let bindGroupLayout = pipeline.layout.getBindGroupLayout(0)

  if (!bindGroupLayout) {
    bindGroupLayout = device.createBindGroupLayout({
      label: `${material.constructor.name}BindGroupLayout`,
      entries: bindings.map((binding) => binding.layout)
    })
    pipeline.layout.setBindGroupLayout(0, bindGroupLayout)
  }

  return device.createBindGroup({
    label: `${material.constructor.name}BindGroup`,
    layout: bindGroupLayout,
    entries: bindings.map((binding) => binding.entry)
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 * @param {import("../../core/layouts/index.js").UniformBufferLayout} layout
 * @param {import("../../objects/index.js").Skin} skin
 */
function getSkinUniformBuffer(device, renderer, layout, skin) {
  const existing = skinUniformBuffers.get(skin)

  if (existing) {
    return existing
  }

  const template = renderer.caches.uniformBuffers.get("SkinBlock")

  assert(template, "SkinBlock uniform buffer missing")

  const name = `SkinBlock:${skinUniformBufferId++}`
  const buffer = renderer.caches.uniformBuffers.getorSet(device, name, layout)

  skinUniformBuffers.set(skin, buffer)
  return buffer
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
 * @param {import("../../core/layouts/index.js").UniformBufferLayout} layout
 * @param {number} skinIndex
 * @param {number} boneCount
 * @returns {ArrayBuffer}
 */
function createSkinUniformData(layout, skinIndex, boneCount) {
  const data = new ArrayBuffer(layout.size)
  const view = new DataView(data)
  let skinIndexWritten = false
  let boneCountWritten = false

  for (const [name, field] of layout.fields.entries()) {
    if (field.type === UniformType.Uint) {
      if (name === "skin_index") {
        view.setUint32(field.offset, skinIndex >>> 0, true)
        skinIndexWritten = true
      } else if (name === "bone_count") {
        view.setUint32(field.offset, boneCount >>> 0, true)
        boneCountWritten = true
      }
    }
  }

  assert(skinIndexWritten, "SkinBlock skin_index field missing")
  assert(boneCountWritten, "SkinBlock bone_count field missing")

  return data
}

/**
 * @param {import("../../core/layouts/index.js").UniformBufferLayout} layout
 * @param {number} cutoff
 * @returns {ArrayBuffer}
 */
function createAlphaMaskUniformData(layout, cutoff) {
  const data = new ArrayBuffer(layout.size)
  const view = new DataView(data)

  view.setFloat32(0, cutoff, true)

  return data
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
 * @param {import("../../texture/index.js").Sampler} sampler
 * @param {TextureType} type
 * @param {TextureFormat} format
 * @returns {{
 *   binding: number,
 *   layout: import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry,
 *   entry: import("../../core/webgl/descriptors.js").WebGLBindGroupEntry
 * }}
 */
function createTextureBinding(binding, name, texture, sampler, type, format) {
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
        texture,
        sampler
      }
    }
  }
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
