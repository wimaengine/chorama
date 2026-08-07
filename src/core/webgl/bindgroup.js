/** @import { WebGLBindGroupDescriptor, WebGLBindGroupEntry } from "./descriptors.js" */
/** @import { WebGLBindGroupBufferResource, WebGLBindGroupTextureResource } from "./descriptors.js" */
/** @import { WebGLBindGroupLayout, WebGLBindGroupLayoutEntry } from "../layouts/bindgroup.js" */
/** @import { WebGLRenderPipeline } from "./renderpipeline.js" */
import { BufferType, TextureFilter, TextureType } from "../../constants/index.js"
import { assert } from "../../utils/index.js"
import { assertTrue } from "../../utils/index.js"

export class WebGLBindGroup {
  /**
   * @readonly
   * @type {string | undefined}
   */
  label

  /**
   * @readonly
   * @type {WebGLBindGroupLayout}
   */
  layout

  /**
   * @readonly
   * @type {readonly WebGLBindGroupEntry[]}
   */
  entries

  /**
   * @private
   * @type {Map<number, WebGLBindGroupEntry>}
   */
  entryMap = new Map()

  /**
   * @param {WebGLBindGroupDescriptor} descriptor
   */
  constructor({ label, layout, entries }) {
    this.label = label
    this.layout = layout
    this.entries = [...entries]

    for (const entry of entries) {
      assertTrue(Number.isInteger(entry.binding) && entry.binding >= 0, `Invalid bind group binding ${entry.binding}`)
      assertTrue(!this.entryMap.has(entry.binding), `Duplicate bind group binding ${entry.binding}`)
      const layoutEntry = layout.getEntry(entry.binding)

      assert(layoutEntry, `Bind group entry ${entry.binding} is not declared in the layout`)
      validateBindGroupResource(entry, layoutEntry)
      this.entryMap.set(entry.binding, entry)
    }

    for (const layoutEntry of layout.entries) {
      assertTrue(this.entryMap.has(layoutEntry.binding), `Bind group is missing binding ${layoutEntry.binding}`)
    }
  }

  /**
   * @param {number} binding
   */
  getEntry(binding) {
    return this.entryMap.get(binding)
  }

  /**
   * Applies the bind group to the active WebGL state.
   * @param {WebGL2RenderingContext} context
   * @param {WebGLRenderPipeline} pipeline
   * @param {number} bindGroupIndex
   */
  apply(context, pipeline, bindGroupIndex) {
    for (const entry of this.entries) {
      const layoutEntry = /** @type {WebGLBindGroupLayoutEntry} */ (this.layout.getEntry(entry.binding))

      if (layoutEntry.buffer !== undefined) {
        applyBufferBinding(
          context,
          pipeline,
          bindGroupIndex,
          layoutEntry,
          /** @type {WebGLBindGroupBufferResource} */ (entry.resource)
        )
        continue
      }

      if (layoutEntry.texture !== undefined) {
        applyTextureBinding(context, pipeline, /** @type {WebGLBindGroupTextureResource} */ (entry.resource), layoutEntry)
      }
    }
  }
}

/**
 * @param {WebGLBindGroupEntry} entry
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function validateBindGroupResource(entry, layoutEntry) {
  if (layoutEntry.buffer !== undefined) {
    validateBufferResource(/** @type {WebGLBindGroupBufferResource} */ (entry.resource), layoutEntry)
    return
  }

  if (layoutEntry.texture !== undefined) {
    validateTextureResource(/** @type {WebGLBindGroupTextureResource} */ (entry.resource), layoutEntry)
    return
  }
}

/**
 * @param {WebGLBindGroupBufferResource} resource
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function validateBufferResource(resource, layoutEntry) {
  const buffer = resource.buffer
  const layout = layoutEntry.buffer

  assertTrue(buffer.type === BufferType.Uniform, `Bind group binding ${layoutEntry.binding} expects a uniform buffer`)

  const offset = resource.offset ?? 0
  const size = resource.size ?? (buffer.size - offset)

  assertTrue(offset >= 0 && Number.isInteger(offset), `Bind group binding ${layoutEntry.binding} has an invalid buffer offset`)
  assertTrue(size >= 0 && Number.isInteger(size), `Bind group binding ${layoutEntry.binding} has an invalid buffer size`)
  assertTrue(offset + size <= buffer.size, `Bind group binding ${layoutEntry.binding} range exceeds the buffer size`)

  if (layout?.minBindingSize !== undefined) {
    assertTrue(size >= layout.minBindingSize, `Bind group binding ${layoutEntry.binding} is smaller than the layout minimum size`)
  }
}

/**
 * @param {WebGLBindGroupTextureResource} resource
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function validateTextureResource(resource, layoutEntry) {
  const texture = resource.texture
  const expectedViewDimension = layoutEntry.texture?.viewDimension ?? "2d"
  const matches =
    (expectedViewDimension === "2d" && texture.type === TextureType.Texture2D) ||
    (expectedViewDimension === "2d-array" && texture.type === TextureType.Texture2DArray) ||
    (expectedViewDimension === "cube" && texture.type === TextureType.TextureCubeMap) ||
    (expectedViewDimension === "3d" && texture.type === TextureType.Texture3D)

  assertTrue(matches, `Bind group binding ${layoutEntry.binding} texture dimension does not match the layout`)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPipeline} pipeline
 * @param {number} bindGroupIndex
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 * @param {WebGLBindGroupBufferResource} resource
 */
function applyBufferBinding(context, pipeline, bindGroupIndex, layoutEntry, resource) {
  const point = pipeline.layout.getBindGroupBufferPoint(bindGroupIndex, layoutEntry.binding)

  assertTrue(point !== undefined, `Pipeline layout does not allocate a binding point for bind group ${bindGroupIndex} binding ${layoutEntry.binding}`)
  const bindingPoint = /** @type {number} */ (point)

  const { buffer, offset = 0, size } = resource

  if (size !== undefined) {
    context.bindBufferRange(buffer.type, bindingPoint, buffer.inner, offset, size)
  } else {
    context.bindBufferBase(buffer.type, bindingPoint, buffer.inner)
  }

  if (layoutEntry.name !== undefined) {
    bindUniformBlock(context, pipeline, layoutEntry.name, bindingPoint)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPipeline} pipeline
 * @param {string} name
 * @param {number} bindingPoint
 */
function bindUniformBlock(context, pipeline, name, bindingPoint) {
  const invalidIndex = context.INVALID_INDEX ?? 0xFFFFFFFF
  const index = context.getUniformBlockIndex(pipeline.program, name)

  assertTrue(index !== invalidIndex, `Uniform block ${name} is not active in the shader program`)
  context.uniformBlockBinding(pipeline.program, index, bindingPoint)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPipeline} pipeline
 * @param {WebGLBindGroupTextureResource} resource
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function applyTextureBinding(context, pipeline, resource, layoutEntry) {
  const { texture, sampler } = resource

  if (!layoutEntry.name) {
    return
  }

  const uniform = pipeline.uniforms.get(layoutEntry.name)

  if (!uniform || uniform.texture_unit === undefined) {
    return
  }

  context.activeTexture(WebGL2RenderingContext.TEXTURE0 + uniform.texture_unit)
  context.bindTexture(texture.type, texture.inner)

  if (sampler) {
    updateTextureSampler(context, texture, sampler)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {import("../resources/index.js").GPUTexture} texture
 * @param {import("../../texture/index.js").Sampler} sampler
 */
function updateTextureSampler(context, texture, sampler) {
  const lod = sampler.lod
  const anisotropyExtenstion = context.getExtension("EXT_texture_filter_anisotropic")

  context.texParameteri(texture.type, context.TEXTURE_MAG_FILTER, sampler.magnificationFilter)
  context.texParameteri(texture.type, context.TEXTURE_WRAP_S, sampler.wrapS)
  context.texParameteri(texture.type, context.TEXTURE_WRAP_T, sampler.wrapT)
  context.texParameteri(texture.type, context.TEXTURE_WRAP_R, sampler.wrapR)

  if (lod) {
    context.texParameteri(texture.type, context.TEXTURE_MIN_LOD, lod.min)
    context.texParameteri(texture.type, context.TEXTURE_MAX_LOD, lod.max)
  }

  if (sampler.mipmapFilter !== undefined) {
    if (sampler.minificationFilter === TextureFilter.Linear) {
      if (sampler.mipmapFilter === TextureFilter.Linear) {
        context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_LINEAR)
      } else if (sampler.mipmapFilter === TextureFilter.Nearest) {
        context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_NEAREST)
      }
    } else if (sampler.minificationFilter === TextureFilter.Nearest) {
      if (sampler.mipmapFilter === TextureFilter.Linear) {
        context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.NEAREST_MIPMAP_LINEAR)
      } else if (sampler.mipmapFilter === TextureFilter.Nearest) {
        context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.NEAREST_MIPMAP_NEAREST)
      }
    }
  } else {
    if (sampler.minificationFilter === TextureFilter.Nearest) {
      context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.NEAREST)
    } else if (sampler.minificationFilter === TextureFilter.Linear) {
      context.texParameteri(texture.type, context.TEXTURE_MIN_FILTER, context.LINEAR)
    }
  }

  if (anisotropyExtenstion) {
    context.texParameterf(texture.type, anisotropyExtenstion.TEXTURE_MAX_ANISOTROPY_EXT, sampler.anisotropy)
  }

  if (sampler.compare !== undefined) {
    context.texParameteri(texture.type, context.TEXTURE_COMPARE_MODE, context.COMPARE_REF_TO_TEXTURE)
    context.texParameteri(texture.type, context.TEXTURE_COMPARE_FUNC, sampler.compare)
  } else {
    context.texParameteri(texture.type, context.TEXTURE_COMPARE_MODE, context.NONE)
  }
}
