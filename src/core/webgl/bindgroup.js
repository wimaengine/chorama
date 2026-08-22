/** @import { WebGLBindGroupDescriptor, WebGLBindGroupEntry, WebGLBindGroupSamplerResource } from "./descriptors.js" */
/** @import { WebGLBindGroupBufferResource, WebGLBindGroupTextureResource } from "./descriptors.js" */
/** @import { WebGLBindGroupLayout, WebGLBindGroupLayoutEntry } from "../layouts/bindgroup.js" */
/** @import { WebGLRenderPipeline } from "./renderpipeline.js" */
import { BufferType, TextureType } from "../../constants/index.js"
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
   * @private
   * @type {readonly number[]}
   */
  dynamicBufferBindings = []

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

    this.dynamicBufferBindings = layout.entries
      .filter((entry) => entry.buffer?.hasDynamicOffset)
      .map((entry) => entry.binding)
      .sort((a, b) => a - b)
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
   * @param {ReadonlyArray<number>} [dynamicOffsets] Offsets for dynamic uniform-buffer bindings, in ascending binding order.
   */
  apply(context, pipeline, bindGroupIndex, dynamicOffsets = []) {
    const dynamicOffsetsByBinding = resolveDynamicOffsets(this.dynamicBufferBindings, dynamicOffsets, this.label)

    for (const entry of this.entries) {
      const layoutEntry = /** @type {WebGLBindGroupLayoutEntry} */ (this.layout.getEntry(entry.binding))

      if (layoutEntry.buffer !== undefined) {
        applyBufferBinding(
          context,
          pipeline,
          bindGroupIndex,
          layoutEntry,
          /** @type {WebGLBindGroupBufferResource} */ (entry.resource),
          dynamicOffsetsByBinding.get(layoutEntry.binding) ?? 0
        )
        continue
      }

      if (layoutEntry.texture !== undefined) {
        applyTextureBinding(context, pipeline, /** @type {WebGLBindGroupTextureResource} */ (entry.resource), layoutEntry)
        continue
      }

      if (layoutEntry.sampler !== undefined) {
        applySamplerBinding(context, pipeline, /** @type {WebGLBindGroupSamplerResource} */ (entry.resource), layoutEntry)
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

  if (layoutEntry.sampler !== undefined) {
    validateSamplerResource(/** @type {WebGLBindGroupSamplerResource} */ (entry.resource), layoutEntry)
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
 * @param {WebGLBindGroupSamplerResource} resource
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function validateSamplerResource(resource, layoutEntry) {
  const expectedType = layoutEntry.sampler?.type ?? "filtering"

  assertTrue(resource.sampler.type === expectedType, `Bind group binding ${layoutEntry.binding} sampler type does not match the layout`)
}

/**
 * @param {readonly number[]} dynamicBufferBindings
 * @param {ReadonlyArray<number>} dynamicOffsets
 * @param {string | undefined} [label]
 * @returns {Map<number, number>}
 */
function resolveDynamicOffsets(dynamicBufferBindings, dynamicOffsets, label) {
  const labelSuffix = label !== undefined ? ` ${label}` : ""

  assertTrue(
    dynamicOffsets.length === dynamicBufferBindings.length,
    `Bind group${labelSuffix} expects ${dynamicBufferBindings.length} dynamic offset${dynamicBufferBindings.length === 1 ? "" : "s"}, got ${dynamicOffsets.length}`
  )

  const offsetsByBinding = new Map()

  for (let i = 0; i < dynamicBufferBindings.length; i++) {
    const binding = dynamicBufferBindings[i]
    const dynamicOffset = /** @type {number} */ (dynamicOffsets[i])

    assertTrue(Number.isInteger(dynamicOffset) && dynamicOffset >= 0, `Bind group${labelSuffix} dynamic offset for binding ${binding} is invalid`)
    offsetsByBinding.set(binding, dynamicOffset)
  }

  return offsetsByBinding
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
  const { texture } = resource

  if (!layoutEntry.name) {
    return
  }

  const uniform = pipeline.uniforms.get(layoutEntry.name)

  if (!uniform || uniform.texture_unit === undefined) {
    return
  }

  context.activeTexture(WebGL2RenderingContext.TEXTURE0 + uniform.texture_unit)
  context.bindTexture(texture.type, texture.inner)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPipeline} pipeline
 * @param {WebGLBindGroupSamplerResource} resource
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 */
function applySamplerBinding(context, pipeline, resource, layoutEntry) {
  if (!layoutEntry.name) {
    return
  }

  const uniform = pipeline.uniforms.get(layoutEntry.name)

  if (!uniform || uniform.texture_unit === undefined) {
    return
  }

  context.bindSampler(uniform.texture_unit, resource.sampler.inner)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPipeline} pipeline
 * @param {number} bindGroupIndex
 * @param {WebGLBindGroupLayoutEntry} layoutEntry
 * @param {WebGLBindGroupBufferResource} resource
 * @param {number} [dynamicOffset=0]
 */
function applyBufferBinding(context, pipeline, bindGroupIndex, layoutEntry, resource, dynamicOffset = 0) {
  const point = pipeline.layout.getBindGroupBufferPoint(bindGroupIndex, layoutEntry.binding)

  assertTrue(point !== undefined, `Pipeline layout does not allocate a binding point for bind group ${bindGroupIndex} binding ${layoutEntry.binding}`)
  const bindingPoint = /** @type {number} */ (point)

  const { buffer, offset = 0, size } = resource
  const bindingOffset = offset + dynamicOffset
  const bindingSize = size ?? (buffer.size - offset)

  if (bindingOffset !== 0 || size !== undefined) {
    const alignment = context.getParameter(context.UNIFORM_BUFFER_OFFSET_ALIGNMENT)

    assertTrue(bindingOffset % alignment === 0, `Bind group binding ${layoutEntry.binding} offset must be aligned to ${alignment}`)
    assertTrue(bindingOffset + bindingSize <= buffer.size, `Bind group binding ${layoutEntry.binding} range exceeds the buffer size`)
    context.bindBufferRange(buffer.type, bindingPoint, buffer.inner, bindingOffset, bindingSize)
  } else {
    context.bindBufferBase(buffer.type, bindingPoint, buffer.inner)
  }

  if (layoutEntry.name !== undefined) {
    bindUniformBlock(context, pipeline, layoutEntry.name, bindingPoint)
  }
}
