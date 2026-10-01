import { assert } from "../../../utils/index.js"
import { TextureFormat, TextureType } from "../../../constants/index.js"
import { MaterialUniforms, MeshMaterialBindGroups, MeshMaterials } from "../resources/index.js"

export class PrepareMaterialBindGroupsNode {
  subgraph() {
    return undefined
  }

  /** @param {import("../../../renderer/graph/index.js").RenderGraphContext} context */
  execute(context) {
    const { renderer, renderDevice } = context
    const materials = renderer.getResource(MeshMaterials)
    const bindGroups = renderer.getResource(MeshMaterialBindGroups)

    assert(materials, "MeshMaterials resource missing")
    assert(bindGroups, "MeshMaterialBindGroups resource missing")

    bindGroups.clear()

    for (const material of materials.materials) {
      const prepared = createMaterialBindGroup(renderDevice, renderer, material)

      if (!prepared) continue

      bindGroups.set(material, prepared.bindGroup, prepared.layout)
    }
  }
}

/**
 * Creates a material bind group entirely from the material descriptor.
 *
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {import("../../../material/index.js").RawMaterial} material
   * @returns {{ bindGroup: import("../../../core/index.js").WebGLBindGroup, layout: import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout } | undefined}
 */
function createMaterialBindGroup(device, renderer, material) {
  const { caches, defaults } = renderer
  const materialUniforms = renderer.getResource(MaterialUniforms)
  /** @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry[]} */
  const layoutEntries = []
  /** @type {import("../../../core/webgl/descriptors.js").WebGLBindGroupEntry[]} */
  const bindGroupEntries = []
  let binding = 0

  assert(materialUniforms, "MaterialUniforms resource missing")

  const materialBuffer = materialUniforms.setData(material)
  const gpuBuffer = caches.getUniformBuffer(device, materialBuffer)
  layoutEntries.push({
    binding,
    name: "MaterialBlock",
    visibility: 0,
    buffer: { type: "uniform" }
  })
  bindGroupEntries.push({ binding, resource: { buffer: gpuBuffer } })
  binding++

  for (const [name, _unusedBinding, texture, sampler] of material.getTextures()) {
    const sourceTexture = texture ?? defaults.texture2D
    const sourceSampler = sampler ?? defaults.textureSampler

    const gpuTexture = caches.getTexture(device, sourceTexture)
    const gpuSampler = caches.getSampler(device, sourceSampler)
    const viewDimension = textureViewDimensionFromType(sourceTexture.type)
    const sampleType = textureSampleTypeFromFormat(sourceTexture.format)

    layoutEntries.push({
      binding,
      name,
      visibility: 0,
      texture: { viewDimension, sampleType }
    })
    layoutEntries.push({
      binding: binding + 1,
      name,
      visibility: 0,
      sampler: { type: gpuSampler.type }
    })
    bindGroupEntries.push({ binding, resource: { texture: gpuTexture } })
    bindGroupEntries.push({ binding: binding + 1, resource: { sampler: gpuSampler } })
    binding += 2
  }

  if (layoutEntries.length === 0) return undefined

  const layout = device.createBindGroupLayout({
    label: `${material.constructor.name}BindGroupLayout`,
    entries: layoutEntries
  })
  const bindGroup = device.createBindGroup({
    label: `${material.constructor.name}BindGroup`,
    layout,
    entries: bindGroupEntries
  })

  return { bindGroup, layout }
}

/**
 * @param {TextureType} type
 * @returns {"2d" | "2d-array" | "cube" | "3d"}
 */
function textureViewDimensionFromType(type) {
  switch (type) {
    case TextureType.Texture2DArray: return "2d-array"
    case TextureType.TextureCubeMap: return "cube"
    case TextureType.Texture3D: return "3d"
    default: return "2d"
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
