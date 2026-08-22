/** @import { Caches } from "../../caches/index.js" */
/** @import { WebGLBindGroup, WebGLBindGroupLayout } from "../../core/index.js" */
/** @import { WebGLRenderDevice } from "../../core/index.js" */
import { NewUniformBuffer } from "../../core/resources/index.js"
import { TextureFormat, TextureType } from "../../constants/index.js"
import { snapUp } from "../../math/index.js"
import { Sampler, Texture } from "../../texture/index.js"
import { assert, assertTrue } from "../../utils/index.js"

/**
 * Descriptor for a uniform-buffer slot in the shared view bind group.
 * @typedef {object} ViewUniformSlot
 * @property {"uniform"} kind
 * @property {number} binding
 * @property {string} name
 * @property {number} minBindingSize
 * @property {boolean} [hasDynamicOffset]
 */

/**
 * Descriptor for a texture slot in the shared view bind group.
 * @typedef {object} ViewTextureSlot
 * @property {"texture"} kind
 * @property {number} binding
 * @property {string} name
 * @property {"2d" | "2d-array" | "cube" | "3d"} [viewDimension]
 */

/**
 * Descriptor for a sampler slot in the shared view bind group.
 * @typedef {object} ViewSamplerSlot
 * @property {"sampler"} kind
 * @property {number} binding
 * @property {string} name
 */

/**
 * Shared slot descriptor used by the renderer and plugins.
 * @typedef {ViewUniformSlot | ViewTextureSlot | ViewSamplerSlot} ViewBindGroupSlot
 */

/**
 * Per-view bind group state shared by the renderer and plugins.
 *
 * Plugins register explicit slot descriptors and the renderer keeps the layout
 * current while callers create transient bind groups on demand.
 */
export class ViewBindGroup {
  /**
   * @type {Map<number, ViewBindGroupItem>}
   */
  #items = new Map()

  /**
   * @type {boolean}
   */
  #dirty = true

  /**
   * @type {WebGLBindGroupLayout | undefined}
   */
  layout

  /**
   * Creates a uniform-buffer slot descriptor.
   *
   * @param {number} binding
   * @param {string} name
   * @param {number} minBindingSize
   * @param {boolean} [hasDynamicOffset=false]
   * @returns {ViewUniformSlot}
   */
  static uniform(binding, name, minBindingSize, hasDynamicOffset = false) {
    return {
      kind: "uniform",
      binding,
      name,
      minBindingSize,
      hasDynamicOffset
    }
  }

  /**
   * Creates a texture slot descriptor.
   *
   * @param {number} binding
   * @param {string} name
   * @param {"2d" | "2d-array" | "cube" | "3d"} [viewDimension]
   * @returns {ViewTextureSlot}
   */
  static texture(binding, name, viewDimension) {
    return viewDimension === undefined ? {
      kind: "texture",
      binding,
      name
    } : {
      kind: "texture",
      binding,
      name,
      viewDimension
    }
  }

  /**
   * Creates a sampler slot descriptor.
   *
   * @param {number} binding
   * @param {string} name
   * @returns {ViewSamplerSlot}
   */
  static sampler(binding, name) {
    return {
      kind: "sampler",
      binding,
      name
    }
  }

  /**
   * Registers a slot/resource pair.
   * The slot binding must be empty.
   *
   * @overload
   * @param {ViewUniformSlot} slot
   * @param {NewUniformBuffer} resource
   * @returns {this}
   */
  /**
   * @overload
   * @param {ViewTextureSlot} slot
   * @param {Texture} resource
   * @returns {this}
   */
  /**
   * @overload
   * @param {ViewSamplerSlot} slot
   * @param {Sampler} resource
   * @returns {this}
   */
  /**
   * @param {ViewBindGroupSlot} slot
   * @param {Texture | Sampler | NewUniformBuffer} resource
   * @returns {this}
   */
  set(slot, resource) {
    assertTrue(slot.binding >= 0, `Invalid view bind group binding ${slot.binding}`)
    assertTrue(slot.name.length > 0, `View bind group binding ${slot.binding} requires a name`)
    assertTrue(!this.#items.has(slot.binding), `View bind group binding ${slot.binding} is already occupied`)

    this.#writeItem(slot, resource)
    return this
  }

  /**
   * Registers or replaces a slot/resource pair.
   * Use this for resources that may change between frames.
   *
   * @overload
   * @param {ViewUniformSlot} slot
   * @param {NewUniformBuffer} resource
   * @returns {this}
   */
  /**
   * @overload
   * @param {ViewTextureSlot} slot
   * @param {Texture} resource
   * @returns {this}
   */
  /**
   * @overload
   * @param {ViewSamplerSlot} slot
   * @param {Sampler} resource
   * @returns {this}
   */
  /**
   * @param {ViewBindGroupSlot} slot
   * @param {Texture | Sampler | NewUniformBuffer} resource
   * @returns {this}
   */
  setOrReplace(slot, resource) {
    assertTrue(slot.binding >= 0, `Invalid view bind group binding ${slot.binding}`)
    assertTrue(slot.name.length > 0, `View bind group binding ${slot.binding} requires a name`)

    const existing = this.#items.get(slot.binding)

    if (existing && slotsMatch(existing.slot, slot) && existing.resource === resource) {
      return this
    }

    this.#writeItem(slot, resource)
    return this
  }

  /**
   * Returns the registered item at the binding point, if any.
   * @param {number} binding
   * @returns {ViewBindGroupItem | undefined}
   */
  get(binding) {
    return this.#items.get(binding)
  }

  /**
   * Returns all registered items in ascending binding order.
   * @returns {ViewBindGroupItem[]}
   */
  items() {
    return [...this.#items.values()].sort((a, b) => a.slot.binding - b.slot.binding)
  }

  /**
   * Ensures the view bind group layout is up to date.
   *
   * @param {WebGLRenderDevice} device
   * @returns {WebGLBindGroupLayout}
   */
  update(device) {
    const items = this.items()
    const layoutEntries = items.map((item) => createLayoutEntry(device, item))

    if (this.layout === undefined || this.#dirty) {
      this.layout = device.createBindGroupLayout({
        label: "ViewBindGroupLayout",
        entries: layoutEntries
      })
      this.#dirty = false
    }

    assert(this.layout, "View bind group layout missing")
    return this.layout
  }

  /**
   * Creates a transient view bind group for the current layout.
   *
   * @param {WebGLRenderDevice} device
   * @param {Caches} caches
   * @returns {WebGLBindGroup}
   */
  createBindGroup(device, caches) {
    const layout = this.update(device)
    const items = this.items()
    const bindGroupEntries = items.map((item) => createBindGroupEntry(device, caches, item))

    return device.createBindGroup({
      label: "ViewBindGroup",
      layout,
      entries: bindGroupEntries
    })
  }

  /**
   * @param {ViewBindGroupSlot} slot
   * @param {Texture | Sampler | NewUniformBuffer} resource
   */
  #writeItem(slot, resource) {
    this.#items.set(slot.binding, {
      slot,
      resource
    })

    this.layout = undefined
    this.#dirty = true
  }
}

/**
 * @typedef ViewBindGroupItem
 * @property {ViewBindGroupSlot} slot
 * @property {Texture | Sampler | NewUniformBuffer} resource
 */

/**
 * @param {WebGLRenderDevice} device
 * @param {ViewBindGroupItem} item
 * @returns {import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry}
 */
function createLayoutEntry(device, item) {
  const { slot, resource } = item
  const { binding, name } = slot

  switch (slot.kind) {
    case "texture": {
      const textureResource = /** @type {Texture} */ (resource)

      return {
        binding,
        name,
        visibility: 0,
        texture: {
          viewDimension: slot.viewDimension ?? textureViewDimensionFromType(textureResource.type),
          sampleType: textureSampleTypeFromFormat(textureResource.format)
        }
      }
    }

    case "sampler": {
      const samplerResource = /** @type {Sampler} */ (resource)

      return {
        binding,
        name,
        visibility: 0,
        sampler: {
          type: samplerResource.compare !== undefined ? "comparison" : "filtering"
        }
      }
    }

    case "uniform": {
      const uniformResource = /** @type {NewUniformBuffer} */ (resource)
      void uniformResource
      const minBindingSize = getAlignedUniformBindingSize(device, slot)

      return {
        binding,
        name,
        visibility: 0,
        buffer: {
          type: "uniform",
          hasDynamicOffset: slot.hasDynamicOffset ?? false,
          minBindingSize
        }
      }
    }

    default:
      throw new Error(`View bind group binding ${binding} uses an unsupported resource kind`)
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {Caches} caches
 * @param {ViewBindGroupItem} item
 * @returns {import("../../core/webgl/descriptors.js").WebGLBindGroupEntry}
 */
function createBindGroupEntry(device, caches, item) {
  const { slot, resource } = item
  const { binding } = slot

  switch (slot.kind) {
    case "texture": {
      const textureResource = /** @type {Texture} */ (resource)

      return {
        binding,
        resource: {
          texture: caches.getTexture(device, textureResource)
        }
      }
    }

    case "sampler": {
      const samplerResource = /** @type {Sampler} */ (resource)

      return {
        binding,
        resource: {
          sampler: caches.getSampler(device, samplerResource)
        }
      }
    }

    case "uniform": {
      const uniformResource = /** @type {NewUniformBuffer} */ (resource)
      const size = getAlignedUniformBindingSize(device, slot)

      return {
        binding,
        resource: {
          buffer: caches.getNewUniformBuffer(device, uniformResource),
          size
        }
      }
    }

    default:
      throw new Error(`View bind group binding ${binding} uses an unsupported resource kind`)
  }
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
 * @returns {"float" | "unfilterable-float" | "depth" | "sint" | "uint"}
 */
function textureSampleTypeFromFormat(format) {
  switch (format) {
    case TextureFormat.Depth16Unorm:
    case TextureFormat.Depth24Plus:
    case TextureFormat.Depth24PlusStencil8:
    case TextureFormat.Depth32Float:
    case TextureFormat.Depth32FloatStencil8:
      return "depth"

    case TextureFormat.R8Uint:
    case TextureFormat.R16Uint:
    case TextureFormat.R32Uint:
    case TextureFormat.RG8Uint:
    case TextureFormat.RG16Uint:
    case TextureFormat.RG32Uint:
    case TextureFormat.RGBA8Uint:
    case TextureFormat.RGBA16Uint:
    case TextureFormat.RGBA32Uint:
      return "uint"

    case TextureFormat.R8Sint:
    case TextureFormat.R16Sint:
    case TextureFormat.R32Sint:
    case TextureFormat.RG8Sint:
    case TextureFormat.RG16Sint:
    case TextureFormat.RG32Sint:
    case TextureFormat.RGBA8Sint:
    case TextureFormat.RGBA16Sint:
    case TextureFormat.RGBA32Sint:
      return "sint"

    case TextureFormat.R16Float:
    case TextureFormat.R32Float:
    case TextureFormat.RG16Float:
    case TextureFormat.RG32Float:
    case TextureFormat.RGBA16Float:
    case TextureFormat.RGBA32Float:
      return "float"

    default:
      return "float"
  }
}

/**
 * Aligns the view uniform buffer size when a slot uses dynamic offsets.
 *
 * @param {WebGLRenderDevice} device
 * @param {ViewUniformSlot} slot
 * @returns {number}
 */
function getAlignedUniformBindingSize(device, slot) {
  if (!slot.hasDynamicOffset) {
    return slot.minBindingSize
  }

  return snapUp(slot.minBindingSize, device.limits.minUniformBufferOffsetAlignment)
}

/**
 * @param {ViewBindGroupSlot} a
 * @param {ViewBindGroupSlot} b
 * @returns {boolean}
 */
function slotsMatch(a, b) {
  if (a.binding !== b.binding || a.name !== b.name || a.kind !== b.kind) {
    return false
  }

  switch (a.kind) {
    case "uniform":
      return b.kind === "uniform" &&
        a.minBindingSize === b.minBindingSize &&
        (a.hasDynamicOffset ?? false) === (b.hasDynamicOffset ?? false)

    case "texture":
      return b.kind === "texture" && a.viewDimension === b.viewDimension

    case "sampler":
      return b.kind === "sampler"

    default:
      return false
  }
}
