/** @import { Caches } from "../../caches/index.js" */
/** @import { WebGLBindGroup, WebGLBindGroupLayout } from "../../core/index.js" */
/** @import { WebGLRenderDevice } from "../../core/index.js" */
import { NewUniformBuffer } from "../../core/resources/index.js"
import { TextureFormat, TextureType } from "../../constants/index.js"
import { Sampler, Texture } from "../../texture/index.js"
import { assert, assertTrue } from "../../utils/index.js"

/**
 * Per-object scene bind group state shared by the renderer and plugins.
 *
 * Plugins register named resources at explicit binding points and the
 * renderer keeps the layout current while callers create transient bind groups
 * on demand.
 */
export class ViewBindGroup {
  /**
   * @type {Map<number, SceneBindGroupItem>}
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
   * Registers a resource at a binding point.
   * The binding point must be empty.
   *
   * @param {number} binding
   * @param {string} name
   * @param {Texture | Sampler | NewUniformBuffer} resource
   * @returns {this}
   */
  set(binding, name, resource) {
    assertTrue(binding >= 0, `Invalid scene bind group binding ${binding}`)
    assertTrue(name.length > 0, `Scene bind group binding ${binding} requires a name`)
    assertTrue(!this.#items.has(binding), `Scene bind group binding ${binding} is already occupied`)

    this.#items.set(binding, {
      binding,
      name,
      resource
    })

    this.layout = undefined
    this.#dirty = true
    return this
  }

  /**
   * Returns the registered item at the binding point, if any.
   * @param {number} binding
   * @returns {SceneBindGroupItem | undefined}
   */
  get(binding) {
    return this.#items.get(binding)
  }

  /**
   * Returns all registered items in ascending binding order.
   * @returns {SceneBindGroupItem[]}
   */
  items() {
    return [...this.#items.values()].sort((a, b) => a.binding - b.binding)
  }

  /**
   * Ensures the scene bind group layout is up to date.
   *
   * @param {WebGLRenderDevice} device
   * @returns {WebGLBindGroupLayout}
   */
  update(device) {
    const items = this.items()
    const layoutEntries = items.map((item) => createLayoutEntry(item))

    if (this.layout === undefined || this.#dirty) {
      this.layout = device.createBindGroupLayout({
        label: "SceneBindGroupLayout",
        entries: layoutEntries
      })
      this.#dirty = false
    }

    assert(this.layout, "Scene bind group layout missing")
    return this.layout
  }

  /**
   * Creates a transient scene bind group for the current layout.
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
      label: "SceneBindGroup",
      layout,
      entries: bindGroupEntries
    })
  }
}

/**
 * @typedef SceneBindGroupItem
 * @property {number} binding
 * @property {string} name
 * @property {Texture | Sampler | NewUniformBuffer} resource
 */

/**
 * @param {SceneBindGroupItem} item
 * @returns {import("../../core/layouts/bindgroup.js").WebGLBindGroupLayoutEntry}
 */
function createLayoutEntry(item) {
  const { binding, name, resource } = item

  if (resource instanceof Texture) {
    return {
      binding,
      name,
      visibility: 0,
      texture: {
        viewDimension: textureViewDimensionFromType(resource.type),
        sampleType: textureSampleTypeFromFormat(resource.format)
      }
    }
  }

  if (resource instanceof Sampler) {
    return {
      binding,
      name,
      visibility: 0,
      sampler: {
        type: resource.compare !== undefined ? "comparison" : "filtering"
      }
    }
  }

  if (resource instanceof NewUniformBuffer) {
    return {
      binding,
      name,
      visibility: 0,
      buffer: {
        type: "uniform",
        minBindingSize: resource.size
      }
    }
  }

  throw new Error(`Scene bind group binding ${binding} uses an unsupported resource type`)
}

/**
 * @param {WebGLRenderDevice} device
 * @param {Caches} caches
 * @param {SceneBindGroupItem} item
 * @returns {import("../../core/webgl/descriptors.js").WebGLBindGroupEntry}
 */
function createBindGroupEntry(device, caches, item) {
  const { binding, resource } = item

  if (resource instanceof Texture) {
    return {
      binding,
      resource: {
        texture: caches.getTexture(device, resource)
      }
    }
  }

  if (resource instanceof Sampler) {
    return {
      binding,
      resource: {
        sampler: caches.getSampler(device, resource)
      }
    }
  }

  if (resource instanceof NewUniformBuffer) {
    return {
      binding,
      resource: {
        buffer: caches.getNewUniformBuffer(device, resource)
      }
    }
  }

  throw new Error(`Scene bind group binding ${binding} uses an unsupported resource type`)
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
