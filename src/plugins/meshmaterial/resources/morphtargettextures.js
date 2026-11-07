/** @import { CachedTexture } from "../../../caches/index.js" */
import { TextureFormat, TextureType } from "../../../constants/index.js"
import { MeshInstanceUniform } from "../../../renderer/resources/meshinstanceuniform.js"
import { Texture } from "../../../texture/index.js"
import { Attribute } from "../../../mesh/index.js"
import { assert } from "../../../utils/index.js"

/**
 * Mesh-scoped texture cache for morph target deltas.
 */
export class MorphTargetTextures {
  /**
   * Number of texture-array layers reserved per morph target.
   * @readonly
   * @type {number}
   */
  static SemanticCount = 3

  /**
   * @param {import("../../../core/limits.js").WebGLDeviceLimits} limits
   */
  constructor(limits) {
    this.#maxTargets = Math.min(
      MeshInstanceUniform.MorphTargetCount,
      Math.floor(limits.maxTextureArrayLayers / MorphTargetTextures.SemanticCount)
    )
    this.#maxDimension = limits.maxTextureDimension2D
  }

  /**
   * @type {WeakMap<import("../../../mesh/index.js").Mesh, MorphTargetTextureState>}
   */
  #states = new WeakMap()

  /**
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout | undefined}
   */
  #bindGroupLayout

  /**
   * @type {number}
   */
  #maxTargets

  /**
   * @type {number}
   */
  #maxDimension

  /**
   * Returns the shared bind-group layout for morph target textures.
   *
   * @param {import("../../../core/index.js").WebGLRenderDevice} device
   * @returns {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  getBindGroupLayout(device) {
    if (!this.#bindGroupLayout) {
      this.#bindGroupLayout = device.createBindGroupLayout({
        label: "MorphTargetTexturesLayout",
        entries: [
          {
            binding: 0,
            name: "morph_targets",
            visibility: 0,
            texture: {
              viewDimension: "2d-array",
              sampleType: "float"
            }
          },
          {
            binding: 1,
            name: "morph_targets",
            visibility: 0,
            sampler: {
              type: "filtering"
            }
          }
        ]
      })
    }

    assert(this.#bindGroupLayout, "Morph target bind group layout missing")
    return this.#bindGroupLayout
  }

  /**
   * Returns the cached morph-texture state for the supplied mesh, creating it
   * on demand.
   *
   * @param {import("../../../mesh/index.js").Mesh} mesh
   * @returns {MorphTargetTextureState | undefined}
   */
  getOrAllocate(mesh) {
    if (mesh.morphTargets.length === 0) {
      return undefined
    }

    const existing = this.#states.get(mesh)
    if (existing) {
      return existing
    }

    const positions = mesh.attributes.get(Attribute.Position3D.name)
    assert(positions, "Morph target meshes require vertex positions")

    const vertexCount = positions.byteLength / (Float32Array.BYTES_PER_ELEMENT * 3)
    const targetCount = Math.min(mesh.morphTargets.length, this.#maxTargets)

    if (targetCount === 0) {
      throw new Error("Morph target texture capacity is insufficient for this device")
    }

    if (targetCount !== mesh.morphTargets.length) {
      console.warn("Morph target count exceeds the supported texture capacity; extra targets will be ignored")
    }

    const { width, height } = chooseTextureDimensions(vertexCount, this.#maxDimension)
    const texelsPerLayer = width * height
    const state = {
      vertexCount,
      targetCount,
      width,
      height,
      texture: createMorphTexture(mesh, width, height, texelsPerLayer, targetCount, vertexCount),
      bindGroup: undefined,
      gpuTexture: undefined,
      gpuSampler: undefined
    }

    this.#states.set(mesh, state)
    return state
  }

  /**
   * Returns the cached bind group for the supplied mesh, creating or updating
   * it when needed.
   *
   * @param {import("../../../core/index.js").WebGLRenderDevice} device
   * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
   * @param {import("../../../mesh/index.js").Mesh} mesh
   * @returns {import("../../../core/index.js").WebGLBindGroup | undefined}
   */
  getBindGroup(device, renderer, mesh) {
    const state = this.getOrAllocate(mesh)

    if (!state) {
      return undefined
    }

    const { caches, defaults } = renderer
    const layout = this.getBindGroupLayout(device)
    const gpuTexture = caches.getTexture(device, state.texture)
    const gpuSampler = caches.getSampler(device, defaults.textureNearestSampler)

    if (
      state.bindGroup &&
      state.gpuTexture === gpuTexture &&
      state.gpuSampler === gpuSampler
    ) {
      return state.bindGroup
    }

    state.gpuTexture = gpuTexture
    state.gpuSampler = gpuSampler

    state.bindGroup = device.createBindGroup({
      label: "MorphTargetTexturesBindGroup",
      layout,
      entries: [
        {
          binding: 0,
          resource: {
            view: gpuTexture.view
          }
        },
        {
          binding: 1,
          resource: {
            sampler: gpuSampler
          }
        }
      ]
    })

    return state.bindGroup
  }
}

/**
 * @typedef {object} MorphTargetTextureState
 * @property {number} vertexCount
 * @property {number} targetCount
 * @property {number} width
 * @property {number} height
 * @property {Texture} texture
 * @property {import("../../../core/index.js").WebGLBindGroup | undefined} bindGroup
 * @property {CachedTexture | undefined} gpuTexture
 * @property {import("../../../core/resources/index.js").GPUSampler | undefined} gpuSampler
 */

/**
 * Creates one RGBA32F 2D-array texture containing all morph semantics.
 *
 * @param {import("../../../mesh/index.js").Mesh} mesh
 * @param {number} width
 * @param {number} height
 * @param {number} texelsPerLayer
 * @param {number} targetCount
 * @param {number} vertexCount
 * @returns {Texture}
 */
function createMorphTexture(mesh, width, height, texelsPerLayer, targetCount, vertexCount) {
  const semanticCount = MorphTargetTextures.SemanticCount
  const buffer = new ArrayBuffer(texelsPerLayer * targetCount * semanticCount * 4 * Float32Array.BYTES_PER_ELEMENT)
  const destination = new Float32Array(buffer)

  for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
    const target = mesh.morphTargets[targetIndex]

    for (let semanticIndex = 0; semanticIndex < semanticCount; semanticIndex++) {
      const semantic = getMorphSemantic(semanticIndex)
      const source = target?.[semantic]

      if (!source) {
        continue
      }

      const sourceFloats = new Float32Array(
        source.buffer,
        source.byteOffset,
        source.byteLength / Float32Array.BYTES_PER_ELEMENT
      )
      const sourceVertexCount = sourceFloats.length / 3
      assert(
        sourceVertexCount === vertexCount,
        "Morph target vertex count does not match the mesh vertex count"
      )

      const layer = targetIndex * semanticCount + semanticIndex
      const layerOffset = layer * texelsPerLayer * 4

      for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
        const sourceOffset = vertexIndex * 3
        const destinationOffset = layerOffset + vertexIndex * 4
        const sourceX = sourceFloats[sourceOffset + 0] ?? 0
        const sourceY = sourceFloats[sourceOffset + 1] ?? 0
        const sourceZ = sourceFloats[sourceOffset + 2] ?? 0

        destination[destinationOffset + 0] = sourceX
        destination[destinationOffset + 1] = sourceY
        destination[destinationOffset + 2] = sourceZ
      }
    }
  }

  return new Texture({
    type: TextureType.Texture2DArray,
    width,
    height,
    depth: targetCount * semanticCount,
    format: TextureFormat.RGBA32Float,
    data: [buffer]
  })
}

/**
 * @param {number} semanticIndex
 * @returns {"position" | "normal" | "tangent"}
 */
function getMorphSemantic(semanticIndex) {
  switch (semanticIndex) {
    case 0:
      return "position"
    case 1:
      return "normal"
    default:
      return "tangent"
  }
}

/**
 * @param {number} vertexCount
 * @param {number} maxDimension
 * @returns {{ width: number, height: number }}
 */
function chooseTextureDimensions(vertexCount, maxDimension) {
  if (vertexCount <= 0) {
    return {
      width: 1,
      height: 1
    }
  }

  const width = Math.min(maxDimension, Math.max(1, Math.ceil(Math.sqrt(vertexCount))))
  const height = Math.ceil(vertexCount / width)

  if (height > maxDimension) {
    throw new Error("Morph target texture dimensions exceed the device limits")
  }

  return { width, height }
}
