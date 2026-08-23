/** @import { GPUMesh, GPUBuffer } from "../resources/index.js" */
/** @import { WebGLDeviceLimits } from "../limits.js" */
/** @import { WebGLBindGroup } from "./bindgroup.js" */
/** @import { WebGLColorValue, WebGLRenderPassDescriptor } from "./descriptors.js" */
import { BufferType, TextureType, hasDepthComponent, hasStencilComponent } from "../../constants/index.js"
import { getFramebufferAttachment, mapVertexFormatToWebGL } from "../../function.js"
import { assert } from "../../utils/index.js"
import { assertTrue } from "../../utils/index.js"

/**
 * @typedef WebGLBoundBindGroup
 * @property {WebGLBindGroup} bindGroup
 * @property {ReadonlyArray<number>} dynamicOffsets
 */

/**
 * @typedef WebGLVertexBufferBinding
 * @property {GPUBuffer} buffer
 * @property {number} offset
 * @property {number | undefined} size
 */

export class WebGLRenderPassEncoder {
  /**
   * @private
   * @type {WebGL2RenderingContext}
   */
  context
  /**
   * @private
   * @type {import("./renderpipeline.js").WebGLRenderPipeline | undefined}
   */
  pipeline
  /**
   * @private
   * @type {(WebGLBoundBindGroup | undefined)[]}
   */
  bindGroups = []
  /**
   * @private
   * @type {(WebGLVertexBufferBinding | undefined)[]}
   */
  vertexBuffers = []
  /**
   * @private
   * @type {GLenum | undefined}
   */
  indexType
  /**
   * @private
   * @type {number}
   */
  indexBufferOffset = 0
  /**
   * @private
   * @type {GLenum[]}
   */
  discardAttachments = []
  /**
   * @private
   * @type {boolean}
   */
  active = true
  /**
   * @private
   * @type {boolean}
   */
  depthReadOnly = false
  /**
   * @private
   * @type {boolean}
   */
  stencilReadOnly = false

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLFramebuffer} drawBuffer
   * @param {WebGLRenderPassDescriptor} descriptor
   * @param {WebGLDeviceLimits} limits
   */
  constructor(context, drawBuffer, descriptor, limits) {
    this.context = context
    this.depthReadOnly = descriptor.depthStencilAttachment?.depthReadOnly ?? false
    this.stencilReadOnly = descriptor.depthStencilAttachment?.stencilReadOnly ?? false

    assert(limits, "Render pass device limits missing")
    beginRenderPass(context, drawBuffer, descriptor, this.discardAttachments, limits)
  }

  /**
   * WebGPU-like API: selects the active render pipeline.
   * @param {import("./renderpipeline.js").WebGLRenderPipeline} pipeline
   */
  setPipeline(pipeline) {
    this.assertActive()
    this.pipeline = pipeline
    retainCompatibleBindGroups(pipeline, this.bindGroups)
    this.context.useProgram(pipeline.program)

    // culling
    if (pipeline.cullMode) {
      this.context.enable(this.context.CULL_FACE)
      this.context.cullFace(pipeline.cullMode)
    } else {
      this.context.disable(this.context.CULL_FACE)
    }

    // depth
    this.context.depthFunc(pipeline.depthCompare)
    this.context.depthMask(!this.depthReadOnly && pipeline.depthWrite)
    if (this.stencilReadOnly) {
      this.context.stencilMask(0)
    }

    // blending
    // NOTE: webgl does not have ability to blend differently on
    // different render targets since state is global.
    const target = pipeline.targets[0]
    if (target && target.blend) {
      const { color, alpha } = target.blend

      this.context.enable(this.context.BLEND)
      this.context.blendEquationSeparate(color.operation, alpha.operation)
      this.context.blendFuncSeparate(
        color.source,
        color.destination,
        alpha.source,
        alpha.destination
      )
    } else {
      this.context.disable(this.context.BLEND)
    }

    for (let index = 0; index < this.bindGroups.length; index++) {
      const bindGroupState = this.bindGroups[index]

      if (bindGroupState) {
        bindGroupState.bindGroup.apply(this.context, pipeline, index, bindGroupState.dynamicOffsets)
      }
    }

    for (let slot = 0; slot < this.vertexBuffers.length; slot++) {
      const binding = this.vertexBuffers[slot]

      if (binding) {
        applyVertexBuffer(this.context, pipeline, slot, binding)
      }
    }
  }

  /**
   * Makeshift bind-group entry point for future expansion.
   * @param {number} index
   * @param {WebGLBindGroup} bindGroup
   * @param {ReadonlyArray<number>} [dynamicOffsets] Offsets for dynamic uniform-buffer bindings, in ascending binding order.
   */
  setBindGroup(index, bindGroup, dynamicOffsets = []) {
    this.assertActive()
    assertTrue(Number.isInteger(index) && index >= 0, `Invalid bind group index ${index}`)
    const storedDynamicOffsets = Array.from(dynamicOffsets)

    if (this.pipeline) {
      validateBindGroupCompatibility(this.pipeline, index, bindGroup)
      bindGroup.apply(this.context, this.pipeline, index, storedDynamicOffsets)
    }

    this.bindGroups[index] = {
      bindGroup,
      dynamicOffsets: storedDynamicOffsets
    }
  }

  /**
   * @param {number} slot
   * @param {GPUBuffer | null} buffer
   * @param {number} [offset=0]
   * @param {number} [size]
   */
  setVertexBuffer(slot, buffer, offset = 0, size) {
    this.assertActive()
    assertTrue(Number.isInteger(slot) && slot >= 0, `Invalid vertex buffer slot ${slot}`)
    assertTrue(Number.isInteger(offset) && offset >= 0, `Invalid vertex buffer offset ${offset}`)

    if (!buffer) {
      this.vertexBuffers[slot] = undefined
      return
    }

    assertTrue(buffer.type === BufferType.Array, "Vertex buffers must use BufferType.Array")

    const binding = { buffer, offset, size }
    this.vertexBuffers[slot] = binding

    if (this.pipeline) {
      applyVertexBuffer(this.context, this.pipeline, slot, binding)
    }
  }

  /**
   * @param {GPUBuffer} buffer
   * @param {"uint16" | "uint32"} indexFormat
   * @param {number} [offset=0]
   * @param {number} [_size]
   */
  setIndexBuffer(buffer, indexFormat, offset = 0, _size) {
    this.assertActive()
    assertTrue(buffer.type === BufferType.ElementArray, "Index buffers must use BufferType.ElementArray")
    assertTrue(Number.isInteger(offset) && offset >= 0, `Invalid index buffer offset ${offset}`)

    this.indexType = getIndexFormatType(this.context, indexFormat)
    this.indexBufferOffset = offset
    this.context.bindVertexArray(null)
    this.context.bindBuffer(buffer.type, buffer.inner)
  }

  /**
   * Sets the viewport in framebuffer pixels.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   * @param {number} [minDepth=0]
   * @param {number} [maxDepth=1]
   */
  setViewport(x, y, width, height, minDepth = 0, maxDepth = 1) {
    this.assertActive()
    this.context.viewport(x, y, width, height)
    this.context.depthRange(minDepth, maxDepth)
  }

  /**
   * Sets the scissor rectangle in framebuffer pixels.
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  setScissorRect(x, y, width, height) {
    this.assertActive()
    this.context.enable(this.context.SCISSOR_TEST)
    this.context.scissor(x, y, width, height)
  }

  /**
   * @param {WebGLColorValue} color
   */
  setBlendConstant(color) {
    this.assertActive()
    const [r, g, b, a] = color

    this.context.blendColor(r, g, b, a)
  }

  /**
   * @param {number} reference
   */
  setStencilReference(reference) {
    this.assertActive()
    this.context.stencilFunc(this.context.ALWAYS, reference, 0xFF)
  }

  /**
   * WebGPU draw for vertex counts, with a compatibility path for GPUMesh.
   * @param {GPUMesh | number} meshOrVertexCount
   * @param {number} [instanceCount=1]
   * @param {number} [firstVertex=0]
   * @param {number} [firstInstance=0]
   */
  draw(meshOrVertexCount, instanceCount = 1, firstVertex = 0, firstInstance = 0) {
    const pipeline = this.getPipelineReadyToDraw()

    if (typeof meshOrVertexCount === "number") {
      assertTrue(firstInstance === 0, "WebGL2 does not support firstInstance")
      this.context.bindVertexArray(null)

      if (instanceCount > 1) {
        this.context.drawArraysInstanced(pipeline.topology, firstVertex, meshOrVertexCount, instanceCount)
      } else {
        this.context.drawArrays(pipeline.topology, firstVertex, meshOrVertexCount)
      }
      return
    }

    assertTrue(instanceCount === 1, "Instanced GPUMesh drawing is not supported")
    assertTrue(firstVertex === 0, "GPUMesh drawing does not support firstVertex")
    assertTrue(firstInstance === 0, "GPUMesh drawing does not support firstInstance")

    this.context.bindVertexArray(meshOrVertexCount.inner)
    if (meshOrVertexCount.indexType !== undefined) {
      this.context.drawElements(pipeline.topology, meshOrVertexCount.count, meshOrVertexCount.indexType, 0)
      return
    }
    this.context.drawArrays(pipeline.topology, 0, meshOrVertexCount.count)
  }

  /**
   * @param {number} indexCount
   * @param {number} [instanceCount=1]
   * @param {number} [firstIndex=0]
   * @param {number} [baseVertex=0]
   * @param {number} [firstInstance=0]
   */
  drawIndexed(indexCount, instanceCount = 1, firstIndex = 0, baseVertex = 0, firstInstance = 0) {
    const pipeline = this.getPipelineReadyToDraw()

    assert(this.indexType, "No active index buffer set on render pass encoder")
    assertTrue(baseVertex === 0, "WebGL2 does not support baseVertex")
    assertTrue(firstInstance === 0, "WebGL2 does not support firstInstance")

    const offset = this.indexBufferOffset + firstIndex * getIndexFormatSize(this.indexType)

    this.context.bindVertexArray(null)
    if (instanceCount > 1) {
      this.context.drawElementsInstanced(pipeline.topology, indexCount, this.indexType, offset, instanceCount)
      return
    }

    this.context.drawElements(pipeline.topology, indexCount, this.indexType, offset)
  }

  /**
   * Draws a non-indexed primitive stream without binding a mesh.
   * @param {number} count
   * @param {number} [first=0]
   */
  drawArrays(count, first = 0) {
    this.draw(count, 1, first)
  }

  end() {
    this.assertActive()
    if (this.discardAttachments.length > 0) {
      this.context.invalidateFramebuffer(this.context.FRAMEBUFFER, this.discardAttachments)
    }

    this.pipeline = undefined
    this.bindGroups.length = 0
    this.vertexBuffers.length = 0
    this.indexType = undefined
    this.indexBufferOffset = 0
    this.active = false
    this.context.bindVertexArray(null)
  }

  assertActive() {
    assertTrue(this.active, "Render pass encoder has ended")
  }

  getPipelineReadyToDraw() {
    this.assertActive()
    assert(this.pipeline, "No active pipeline set on render pass encoder")
    validateRequiredBindGroups(this.pipeline, this.bindGroups)
    return this.pipeline
  }
}

/**
 * @param {import("./renderpipeline.js").WebGLRenderPipeline} pipeline
 * @param {number} index
 * @param {WebGLBindGroup} bindGroup
 */
function validateBindGroupCompatibility(pipeline, index, bindGroup) {
  const expectedLayout = pipeline.layout.getBindGroupLayout(index)

  assert(expectedLayout, `Pipeline does not declare bind group ${index}`)
  assertTrue(expectedLayout.compatibleWith(bindGroup.layout), `Bind group ${index} is not compatible with the active pipeline layout`)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLFramebuffer} drawBuffer
 * @param {WebGLRenderPassDescriptor} descriptor
 * @param {GLenum[]} discardAttachments
 * @param {WebGLDeviceLimits} limits
 */
function beginRenderPass(context, drawBuffer, descriptor, discardAttachments, limits) {
  const useDefaultFramebuffer = descriptor.defaultFramebuffer ?? false
  const drawBuffers = resolveDrawBuffers(context, descriptor, limits)

  context.bindFramebuffer(context.FRAMEBUFFER, useDefaultFramebuffer ? null : drawBuffer)

  if (!useDefaultFramebuffer) {
    configureFramebufferAttachments(context, descriptor, limits)
  }

  context.drawBuffers(drawBuffers)
  setInitialViewportAndScissor(context, descriptor)
  configureDepthStencilState(context, descriptor)
  clearRenderPassAttachments(context, descriptor)
  collectDiscardAttachments(context, descriptor, drawBuffers, discardAttachments)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 * @param {WebGLDeviceLimits} limits
 * @returns {GLenum[]}
 */
function resolveDrawBuffers(context, descriptor, limits) {
  const { colorAttachments, defaultFramebuffer = false } = descriptor
  const maxColorAttachments = limits.maxColorAttachments

  if (colorAttachments.length === 0) {
    return [context.NONE]
  }

  return colorAttachments.slice(0, maxColorAttachments).map((attachment, index) => {
    if (!attachment) {
      return context.NONE
    }

    if (!defaultFramebuffer) {
      assert(attachment.texture, `Render pass color attachment ${index} does not have a texture`)
    }

    return defaultFramebuffer ? context.BACK : context.COLOR_ATTACHMENT0 + index
  })
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 * @param {WebGLDeviceLimits} limits
 */
function configureFramebufferAttachments(context, descriptor, limits) {
  const maxColorAttachments = limits.maxColorAttachments

  for (let i = 0; i < maxColorAttachments; i++) {
    const attachment = descriptor.colorAttachments[i]
    const colorAttachment = context.COLOR_ATTACHMENT0 + i

    if (attachment?.texture) {
      attachTextureToFramebuffer(
        context,
        colorAttachment,
        attachment.texture,
        attachment.mipLevel ?? 0,
        attachment.layer ?? 0
      )
    } else {
      context.framebufferTexture2D(context.FRAMEBUFFER, colorAttachment, context.TEXTURE_2D, null, 0)
    }
  }

  context.framebufferTexture2D(context.FRAMEBUFFER, context.DEPTH_ATTACHMENT, context.TEXTURE_2D, null, 0)
  context.framebufferTexture2D(context.FRAMEBUFFER, context.STENCIL_ATTACHMENT, context.TEXTURE_2D, null, 0)
  context.framebufferTexture2D(context.FRAMEBUFFER, context.DEPTH_STENCIL_ATTACHMENT, context.TEXTURE_2D, null, 0)

  const depthStencilTexture = descriptor.depthStencilAttachment?.texture

  if (descriptor.depthStencilAttachment) {
    assert(depthStencilTexture, "Render pass depth/stencil attachment does not have a texture")
  }

  if (depthStencilTexture) {
    attachTextureToFramebuffer(
      context,
      getFramebufferAttachment(depthStencilTexture.actualFormat),
      depthStencilTexture,
      descriptor.depthStencilAttachment?.mipLevel ?? 0,
      descriptor.depthStencilAttachment?.layer ?? 0
    )
  }

  const status = context.checkFramebufferStatus(context.FRAMEBUFFER)

  assertTrue(status === context.FRAMEBUFFER_COMPLETE, `Render pass framebuffer is incomplete: ${status}`)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {GLenum} attachment
 * @param {import("../resources/index.js").GPUTexture} texture
 * @param {number} mipLevel
 * @param {number} layer
 */
function attachTextureToFramebuffer(context, attachment, texture, mipLevel, layer) {
  switch (texture.type) {
    case TextureType.Texture2D:
      context.framebufferTexture2D(
        context.FRAMEBUFFER,
        attachment,
        context.TEXTURE_2D,
        texture.inner,
        mipLevel
      )
      break
    case TextureType.Texture2DArray:
      context.framebufferTextureLayer(
        context.FRAMEBUFFER,
        attachment,
        texture.inner,
        mipLevel,
        layer
      )
      break
    default:
      throw new Error("Texture type is not supported as a render pass attachment")
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 */
function setInitialViewportAndScissor(context, descriptor) {
  const { viewport, scissor, depthRange } = descriptor
  const viewportPixels = rectangleToPixels(descriptor, viewport)
  const minDepth = depthRange?.start ?? 0
  const maxDepth = depthRange?.end ?? 1

  context.viewport(
    viewportPixels.x,
    viewportPixels.y,
    viewportPixels.width,
    viewportPixels.height
  )
  context.depthRange(minDepth, maxDepth)

  const scissorRectangle = scissor || viewport

  if (!scissorRectangle) {
    context.disable(context.SCISSOR_TEST)
    return
  }

  const scissorPixels = rectangleToPixels(descriptor, scissorRectangle)

  context.enable(context.SCISSOR_TEST)
  context.scissor(
    scissorPixels.x,
    scissorPixels.y,
    scissorPixels.width,
    scissorPixels.height
  )
}

/**
 * @param {{ width: number, height: number }} target
 * @param {import("../../utils/index.js").ViewRectangle | undefined} rectangle
 */
function rectangleToPixels(target, rectangle) {
  if (!rectangle) {
    return {
      x: 0,
      y: 0,
      width: target.width,
      height: target.height
    }
  }

  return {
    x: rectangle.offset.x * target.width,
    y: rectangle.offset.y * target.height,
    width: rectangle.size.x * target.width,
    height: rectangle.size.y * target.height
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 */
function configureDepthStencilState(context, descriptor) {
  const { depthStencilAttachment } = descriptor

  if (!depthStencilAttachment) {
    context.disable(context.DEPTH_TEST)
    context.disable(context.STENCIL_TEST)
    return
  }

  const format = depthStencilAttachment.texture?.actualFormat
  const depthRequested = depthStencilAttachment.depthLoadOp !== undefined ||
    depthStencilAttachment.depthStoreOp !== undefined ||
    depthStencilAttachment.depthClearValue !== undefined
  const stencilRequested = depthStencilAttachment.stencilLoadOp !== undefined ||
    depthStencilAttachment.stencilStoreOp !== undefined ||
    depthStencilAttachment.stencilClearValue !== undefined

  if (format !== undefined) {
    assertTrue(!depthRequested || hasDepthComponent(format), "Render pass depth attachment does not have a depth component")
    assertTrue(!stencilRequested || hasStencilComponent(format), "Render pass stencil attachment does not have a stencil component")
  }

  if (depthRequested) {
    context.enable(context.DEPTH_TEST)
  } else {
    context.disable(context.DEPTH_TEST)
  }

  if (stencilRequested) {
    context.enable(context.STENCIL_TEST)
    context.stencilMask(depthStencilAttachment.stencilReadOnly ? 0 : 0xFF)
  } else {
    context.disable(context.STENCIL_TEST)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 */
function clearRenderPassAttachments(context, descriptor) {
  const { colorAttachments, depthStencilAttachment } = descriptor

  for (let i = 0; i < colorAttachments.length; i++) {
    const attachment = colorAttachments[i]

    if (!attachment || attachment.loadOp !== "clear") {
      continue
    }

    const [r, g, b, a] = attachment.clearValue ?? [0, 0, 0, 0]

    context.colorMask(true, true, true, true)
    context.clearBufferfv(context.COLOR, i, new Float32Array([r, g, b, a]))
  }

  if (!depthStencilAttachment) {
    return
  }

  const clearDepth = depthStencilAttachment.depthLoadOp === "clear"
  const clearStencil = depthStencilAttachment.stencilLoadOp === "clear"

  if (clearDepth && clearStencil) {
    context.depthMask(true)
    context.stencilMask(0xFF)
    context.clearBufferfi(
      context.DEPTH_STENCIL,
      0,
      depthStencilAttachment.depthClearValue ?? 1,
      depthStencilAttachment.stencilClearValue ?? 0
    )
    return
  }

  if (clearDepth) {
    context.depthMask(true)
    context.clearBufferfv(context.DEPTH, 0, new Float32Array([depthStencilAttachment.depthClearValue ?? 1]))
  }

  if (clearStencil) {
    context.stencilMask(0xFF)
    context.clearBufferiv(context.STENCIL, 0, new Int32Array([depthStencilAttachment.stencilClearValue ?? 0]))
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLRenderPassDescriptor} descriptor
 * @param {GLenum[]} drawBuffers
 * @param {GLenum[]} discardAttachments
 */
function collectDiscardAttachments(context, descriptor, drawBuffers, discardAttachments) {
  const { colorAttachments, depthStencilAttachment, defaultFramebuffer = false } = descriptor

  for (let i = 0; i < colorAttachments.length; i++) {
    const attachment = colorAttachments[i]

    if (!attachment || attachment.storeOp !== "discard") {
      continue
    }

    const drawBuffer = drawBuffers[i]

    assert(drawBuffer, `Framebuffer does not have color attachment ${i}`)
    discardAttachments.push(defaultFramebuffer ? context.COLOR : drawBuffer)
  }

  if (!depthStencilAttachment) {
    return
  }

  if (depthStencilAttachment.depthStoreOp === "discard") {
    discardAttachments.push(defaultFramebuffer ? context.DEPTH : context.DEPTH_ATTACHMENT)
  }

  if (depthStencilAttachment.stencilStoreOp === "discard") {
    discardAttachments.push(defaultFramebuffer ? context.STENCIL : context.STENCIL_ATTACHMENT)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {import("./renderpipeline.js").WebGLRenderPipeline} pipeline
 * @param {number} slot
 * @param {WebGLVertexBufferBinding} binding
 */
function applyVertexBuffer(context, pipeline, slot, binding) {
  const layout = pipeline.vertexLayout.layouts[slot]

  assert(layout, `Pipeline does not declare vertex buffer slot ${slot}`)

  context.bindVertexArray(null)
  context.bindBuffer(binding.buffer.type, binding.buffer.inner)

  for (const attribute of layout.attributes) {
    setVertexAttribute(context, attribute.id, mapVertexFormatToWebGL(attribute.format), 0, binding.offset)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {number} index
 * @param {import("../../function.js").WebGLAtttributeParams} params
 * @param {number} stride
 * @param {number} offset
 */
function setVertexAttribute(context, index, params, stride, offset) {
  const { type, size, normalized } = params

  context.enableVertexAttribArray(index)
  switch (type) {
    case WebGL2RenderingContext.FLOAT:
      context.vertexAttribPointer(index, size, type, normalized, stride, offset)
      break
    case WebGL2RenderingContext.BYTE:
    case WebGL2RenderingContext.UNSIGNED_BYTE:
    case WebGL2RenderingContext.SHORT:
    case WebGL2RenderingContext.UNSIGNED_SHORT:
    case WebGL2RenderingContext.INT:
    case WebGL2RenderingContext.UNSIGNED_INT:
      if (normalized) {
        context.vertexAttribPointer(index, size, type, normalized, stride, offset)
      } else {
        context.vertexAttribIPointer(index, size, type, stride, offset)
      }
      break
    default:
      throw new Error(`Unsupported GlDataType: ${type.toString()}`)
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {"uint16" | "uint32"} indexFormat
 */
function getIndexFormatType(context, indexFormat) {
  switch (indexFormat) {
    case "uint16":
      return context.UNSIGNED_SHORT
    case "uint32":
      return context.UNSIGNED_INT
    default:
      throw new Error(`Unsupported index format: ${indexFormat}`)
  }
}

/**
 * @param {GLenum} indexType
 */
function getIndexFormatSize(indexType) {
  switch (indexType) {
    case WebGL2RenderingContext.UNSIGNED_SHORT:
      return 2
    case WebGL2RenderingContext.UNSIGNED_INT:
      return 4
    default:
      throw new Error(`Unsupported index type: ${indexType}`)
  }
}

/**
 * Keeps only bind groups that still match the active pipeline layout at the same index.
 * @param {import("./renderpipeline.js").WebGLRenderPipeline} pipeline
 * @param {Array<WebGLBoundBindGroup | undefined>} bindGroups
 */
function retainCompatibleBindGroups(pipeline, bindGroups) {
  for (let index = 0; index < bindGroups.length; index++) {
    const bindGroupState = bindGroups[index]

    if (!bindGroupState) {
      continue
    }

    const expectedLayout = pipeline.layout.getBindGroupLayout(index)

    if (!expectedLayout || !expectedLayout.compatibleWith(bindGroupState.bindGroup.layout)) {
      bindGroups[index] = undefined
    }
  }
}

/**
 * @param {import("./renderpipeline.js").WebGLRenderPipeline} pipeline
 * @param {ReadonlyArray<WebGLBoundBindGroup | undefined>} bindGroups
 */
function validateRequiredBindGroups(pipeline, bindGroups) {
  for (let i = 0; i < pipeline.layout.bindGroupLayouts.length; i++) {
    const layout = pipeline.layout.bindGroupLayouts[i]

    if (!layout || layout.entries.length === 0) {
      continue
    }

    const bindGroup = bindGroups[i]

    assert(bindGroup, `Pipeline requires bind group ${i}`)
  }
}
