/** @import { GPUBuffer, GPUTexture } from "../resources/index.js" */
/** @import { WebGLRenderPassDescriptor } from "./descriptors.js" */
import { TextureFormat, TextureType } from "../../constants/index.js"
import { assertTrue } from "../../utils/index.js"
import { getFramebufferAttachment, mapWebGLAttachmentToBufferBit } from "../../function.js"
import { getMipLevelSize } from "./utils.js"
import { WebGLRenderPassEncoder } from "./renderpassencoder.js"

/**
 * WebGPU-shaped command encoder for the WebGL backend.
 *
 * The encoder executes immediately against the WebGL context. `finish()` is
 * kept as a compatibility hook so WebGPU-shaped call sites still read cleanly.
 */
export class WebGLCommandEncoder {
  /**
   * @private
   * @type {WebGL2RenderingContext}
   */
  context

  /**
   * @private
   * @type {WebGLFramebuffer}
   */
  drawBuffer

  /**
   * @private
   * @type {WebGLFramebuffer}
   */
  readBuffer

  /**
   * @private
   * @type {import("../limits.js").WebGLDeviceLimits}
   */
  limits

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLFramebuffer} drawBuffer
   * @param {WebGLFramebuffer} readBuffer
   * @param {import("../limits.js").WebGLDeviceLimits} limits
   */
  constructor(context, drawBuffer, readBuffer, limits) {
    this.context = context
    this.drawBuffer = drawBuffer
    this.readBuffer = readBuffer
    this.limits = limits
  }

  /**
   * WebGPU-style pass entry point.
   * @param {WebGLRenderPassDescriptor} descriptor
   */
  beginRenderPass(descriptor) {
    return new WebGLRenderPassEncoder(this.context, this.drawBuffer, descriptor, this.limits)
  }

  /**
   * WebGPU compatibility hook. WebGL executes commands immediately, so this
   * returns the encoder itself.
   * @returns {this}
   */
  finish() {
    return this
  }

  /**
   * @param {GPUBuffer} source
   * @param {number} sourceOffset
   * @param {GPUBuffer} destination
   * @param {number} destinationOffset
   * @param {number} size
   */
  copyBufferToBuffer(source, sourceOffset, destination, destinationOffset, size) {
    const { context } = this

    assertBufferRange(source, sourceOffset, size, "source")
    assertBufferRange(destination, destinationOffset, size, "destination")
    assertNoBufferOverlap(source, sourceOffset, destination, destinationOffset, size)
    context.bindBuffer(context.COPY_READ_BUFFER, source.inner)
    context.bindBuffer(context.COPY_WRITE_BUFFER, destination.inner)
    context.copyBufferSubData(
      context.COPY_READ_BUFFER,
      context.COPY_WRITE_BUFFER,
      sourceOffset,
      destinationOffset,
      size
    )
  }

  /**
   * @param {WebGLImageCopyBuffer} source
   * @param {WebGLImageCopyTexture} destination
   * @param {WebGLExtent3D} copySize
   */
  copyBufferToTexture(source, destination, copySize) {
    const { context } = this
    const texture = destination.texture
    const mipLevel = destination.mipLevel ?? 0
    const origin = normalizeOrigin(destination.origin)
    const extent = normalizeExtent(copySize)
    const pixelSize = getTextureCopyPixelSize(texture)
    const bufferLayout = resolveBufferLayout(source, extent, pixelSize)

    assertTextureCopyRegion(texture, origin, extent, mipLevel)
    context.bindBuffer(context.PIXEL_UNPACK_BUFFER, source.buffer.inner)
    context.pixelStorei(context.UNPACK_ALIGNMENT, 1)
    context.pixelStorei(context.UNPACK_ROW_LENGTH, bufferLayout.bytesPerRow / pixelSize)
    context.pixelStorei(
      context.UNPACK_IMAGE_HEIGHT,
      texture.type === TextureType.Texture2D ? 0 : bufferLayout.rowsPerImage
    )
    context.pixelStorei(context.UNPACK_SKIP_PIXELS, 0)
    context.pixelStorei(context.UNPACK_SKIP_ROWS, 0)
    context.pixelStorei(context.UNPACK_SKIP_IMAGES, 0)

    context.bindTexture(texture.type, texture.inner)

    if (texture.type === TextureType.TextureCubeMap) {
      for (let layer = 0; layer < extent.depthOrArrayLayers; layer++) {
        const face = origin.z + layer
        const faceTarget = getCubeFaceTarget(context, face)
        const layerOffset = bufferLayout.offset + layer * bufferLayout.layerStride

        context.texSubImage2D(
          faceTarget,
          mipLevel,
          origin.x,
          origin.y,
          extent.width,
          extent.height,
          texture.format.format,
          texture.format.dataType,
          layerOffset
        )
      }
      return
    }

    if (texture.type === TextureType.Texture2D) {
      assertTrue(extent.depthOrArrayLayers === 1, "2D texture copies can only cover one layer")
      assertTrue(origin.z === 0, "2D texture copies cannot use a Z origin")

      context.texSubImage2D(
        context.TEXTURE_2D,
        mipLevel,
        origin.x,
        origin.y,
        extent.width,
        extent.height,
        texture.format.format,
        texture.format.dataType,
        bufferLayout.offset
      )
      return
    }

    context.texSubImage3D(
      texture.type,
      mipLevel,
      origin.x,
      origin.y,
      origin.z,
      extent.width,
      extent.height,
      extent.depthOrArrayLayers,
      texture.format.format,
      texture.format.dataType,
      bufferLayout.offset
    )
  }

  /**
   * @param {WebGLImageCopyTexture} source
   * @param {WebGLImageCopyBuffer} destination
   * @param {WebGLExtent3D} copySize
   */
  copyTextureToBuffer(source, destination, copySize) {
    const { context } = this
    const texture = source.texture
    const mipLevel = source.mipLevel ?? 0
    const origin = normalizeOrigin(source.origin)
    const extent = normalizeExtent(copySize)
    const attachment = getFramebufferAttachment(texture.actualFormat)
    const pixelSize = getTextureCopyPixelSize(texture)
    const bufferLayout = resolveBufferLayout(destination, extent, pixelSize)

    assertTextureCopyRegion(texture, origin, extent, mipLevel)
    context.bindBuffer(context.PIXEL_PACK_BUFFER, destination.buffer.inner)
    context.pixelStorei(context.PACK_ALIGNMENT, 1)
    context.pixelStorei(context.PACK_ROW_LENGTH, bufferLayout.bytesPerRow / pixelSize)
    context.pixelStorei(context.PACK_SKIP_PIXELS, 0)
    context.pixelStorei(context.PACK_SKIP_ROWS, 0)

    context.bindFramebuffer(context.READ_FRAMEBUFFER, this.readBuffer)

    if (attachment === context.COLOR_ATTACHMENT0) {
      context.readBuffer(context.COLOR_ATTACHMENT0)
    }

    if (texture.type === TextureType.TextureCubeMap) {
      for (let layer = 0; layer < extent.depthOrArrayLayers; layer++) {
        const face = origin.z + layer
        const faceTarget = getCubeFaceTarget(context, face)
        const layerOffset = bufferLayout.offset + layer * bufferLayout.layerStride

        attachTextureToFramebuffer(context, context.READ_FRAMEBUFFER, attachment, texture, mipLevel, face, faceTarget)
        assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
        context.readPixels(
          origin.x,
          origin.y,
          extent.width,
          extent.height,
          texture.format.format,
          texture.format.dataType,
          layerOffset
        )
      }
      return
    }

    if (texture.type === TextureType.Texture2D) {
      assertTrue(extent.depthOrArrayLayers === 1, "2D texture copies can only cover one layer")
      assertTrue(origin.z === 0, "2D texture copies cannot use a Z origin")

      attachTextureToFramebuffer(context, context.READ_FRAMEBUFFER, attachment, texture, mipLevel, 0, undefined)
      assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
      context.readPixels(
        origin.x,
        origin.y,
        extent.width,
        extent.height,
        texture.format.format,
        texture.format.dataType,
        bufferLayout.offset
      )
      return
    }

    for (let layer = 0; layer < extent.depthOrArrayLayers; layer++) {
      const layerIndex = origin.z + layer
      const layerOffset = bufferLayout.offset + layer * bufferLayout.layerStride

      attachTextureToFramebuffer(context, context.READ_FRAMEBUFFER, attachment, texture, mipLevel, layerIndex, undefined)
      assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
      context.readPixels(
        origin.x,
        origin.y,
        extent.width,
        extent.height,
        texture.format.format,
        texture.format.dataType,
        layerOffset
      )
    }
  }

  /**
   * @param {WebGLImageCopyTexture} source
   * @param {WebGLImageCopyTexture} destination
   * @param {WebGLExtent3D} copySize
   */
  copyTextureToTexture(source, destination, copySize) {
    const { context } = this
    const sourceTexture = source.texture
    const destinationTexture = destination.texture
    const sourceMipLevel = source.mipLevel ?? 0
    const destinationMipLevel = destination.mipLevel ?? 0
    const sourceOrigin = normalizeOrigin(source.origin)
    const destinationOrigin = normalizeOrigin(destination.origin)
    const extent = normalizeExtent(copySize)
    const attachment = getFramebufferAttachment(sourceTexture.actualFormat)
    const mask = mapWebGLAttachmentToBufferBit(attachment)

    assertTrue(
      sourceTexture.actualFormat === destinationTexture.actualFormat,
      "Texture copies require matching formats"
    )
    assertTrue(
      sourceTexture.type === destinationTexture.type,
      "Texture copies require matching texture types"
    )

    assertTextureCopyRegion(sourceTexture, sourceOrigin, extent, sourceMipLevel)
    assertTextureCopyRegion(destinationTexture, destinationOrigin, extent, destinationMipLevel)
    context.bindFramebuffer(context.READ_FRAMEBUFFER, this.readBuffer)
    context.bindFramebuffer(context.DRAW_FRAMEBUFFER, this.drawBuffer)

    if (attachment === context.COLOR_ATTACHMENT0) {
      context.readBuffer(context.COLOR_ATTACHMENT0)
      context.drawBuffers([context.COLOR_ATTACHMENT0])
    } else {
      context.drawBuffers([context.NONE])
    }

    if (sourceTexture.type === TextureType.TextureCubeMap) {
      for (let layer = 0; layer < extent.depthOrArrayLayers; layer++) {
        const sourceFace = sourceOrigin.z + layer
        const destinationFace = destinationOrigin.z + layer
        const sourceFaceTarget = getCubeFaceTarget(context, sourceFace)
        const destinationFaceTarget = getCubeFaceTarget(context, destinationFace)

        attachTextureToFramebuffer(
          context,
          context.READ_FRAMEBUFFER,
          attachment,
          sourceTexture,
          sourceMipLevel,
          sourceFace,
          sourceFaceTarget
        )
        attachTextureToFramebuffer(
          context,
          context.DRAW_FRAMEBUFFER,
          attachment,
          destinationTexture,
          destinationMipLevel,
          destinationFace,
          destinationFaceTarget
        )

        assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
        assertFramebufferComplete(context, context.DRAW_FRAMEBUFFER, "Draw")

        context.blitFramebuffer(
          sourceOrigin.x,
          sourceOrigin.y,
          sourceOrigin.x + extent.width,
          sourceOrigin.y + extent.height,
          destinationOrigin.x,
          destinationOrigin.y,
          destinationOrigin.x + extent.width,
          destinationOrigin.y + extent.height,
          mask,
          context.NEAREST
        )
      }
      return
    }

    if (sourceTexture.type === TextureType.Texture2D) {
      assertTrue(extent.depthOrArrayLayers === 1, "2D texture copies can only cover one layer")
      assertTrue(sourceOrigin.z === 0, "2D texture copies cannot use a Z origin")
      assertTrue(destinationOrigin.z === 0, "2D texture copies cannot use a Z origin")

      attachTextureToFramebuffer(context, context.READ_FRAMEBUFFER, attachment, sourceTexture, sourceMipLevel, 0, undefined)
      attachTextureToFramebuffer(context, context.DRAW_FRAMEBUFFER, attachment, destinationTexture, destinationMipLevel, 0, undefined)
      assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
      assertFramebufferComplete(context, context.DRAW_FRAMEBUFFER, "Draw")

      context.blitFramebuffer(
        sourceOrigin.x,
        sourceOrigin.y,
        sourceOrigin.x + extent.width,
        sourceOrigin.y + extent.height,
        destinationOrigin.x,
        destinationOrigin.y,
        destinationOrigin.x + extent.width,
        destinationOrigin.y + extent.height,
        mask,
        context.NEAREST
      )
      return
    }

    for (let layer = 0; layer < extent.depthOrArrayLayers; layer++) {
      const sourceLayer = sourceOrigin.z + layer
      const destinationLayer = destinationOrigin.z + layer

      attachTextureToFramebuffer(context, context.READ_FRAMEBUFFER, attachment, sourceTexture, sourceMipLevel, sourceLayer, undefined)
      attachTextureToFramebuffer(context, context.DRAW_FRAMEBUFFER, attachment, destinationTexture, destinationMipLevel, destinationLayer, undefined)
      assertFramebufferComplete(context, context.READ_FRAMEBUFFER, "Read")
      assertFramebufferComplete(context, context.DRAW_FRAMEBUFFER, "Draw")

      context.blitFramebuffer(
        sourceOrigin.x,
        sourceOrigin.y,
        sourceOrigin.x + extent.width,
        sourceOrigin.y + extent.height,
        destinationOrigin.x,
        destinationOrigin.y,
        destinationOrigin.x + extent.width,
        destinationOrigin.y + extent.height,
        mask,
        context.NEAREST
      )
    }
  }
}

/**
 * @typedef WebGLExtent3D
 * @property {number} width
 * @property {number} height
 * @property {number} [depthOrArrayLayers]
 */

/**
 * @typedef {{ width: number, height: number, depthOrArrayLayers: number }} NormalizedWebGLExtent3D
 */

/**
 * @typedef WebGLImageCopyBuffer
 * @property {GPUBuffer} buffer
 * @property {number} [offset]
 * @property {number} [bytesPerRow]
 * @property {number} [rowsPerImage]
 */

/**
 * @typedef WebGLImageCopyTexture
 * @property {GPUTexture} texture
 * @property {number} [mipLevel]
 * @property {{ x: number, y: number, z: number }} [origin]
 * @property {"all" | "depth-only" | "stencil-only"} [aspect]
 */

/**
 * @param {{ x: number, y: number, z: number } | undefined} origin
 */
function normalizeOrigin(origin) {
  return {
    x: origin?.x ?? 0,
    y: origin?.y ?? 0,
    z: origin?.z ?? 0
  }
}

/**
 * @param {WebGLExtent3D} extent
 * @returns {NormalizedWebGLExtent3D}
 */
function normalizeExtent(extent) {
  assertTrue(Number.isInteger(extent.width) && extent.width > 0, `Invalid copy width ${extent.width}`)
  assertTrue(Number.isInteger(extent.height) && extent.height > 0, `Invalid copy height ${extent.height}`)
  const depthOrArrayLayers = extent.depthOrArrayLayers ?? 1
  assertTrue(
    Number.isInteger(depthOrArrayLayers) && depthOrArrayLayers > 0,
    `Invalid copy depth or array layer count ${depthOrArrayLayers}`
  )

  return {
    width: extent.width,
    height: extent.height,
    depthOrArrayLayers
  }
}

/**
 * @param {GPUTexture} texture
 * @param {{ x: number, y: number, z: number }} origin
 * @param {NormalizedWebGLExtent3D} extent
 * @param {number} mipLevel
 */
function assertTextureCopyRegion(texture, origin, extent, mipLevel) {
  const levelSize = getMipLevelSize(texture.type, texture.width, texture.height, texture.depth, mipLevel)
  const maxDepth = texture.type === TextureType.Texture2D ? 1 : levelSize.depth

  assertTrue(
    Number.isInteger(origin.x) && origin.x >= 0 &&
    Number.isInteger(origin.y) && origin.y >= 0 &&
    Number.isInteger(origin.z) && origin.z >= 0,
    "Texture copy origin must use non-negative integers"
  )
  assertTrue(
    Number.isInteger(extent.depthOrArrayLayers) && extent.depthOrArrayLayers > 0,
    `Invalid copy depth or array layer count ${extent.depthOrArrayLayers}`
  )
  assertTrue(origin.x + extent.width <= levelSize.width, "Texture copy width exceeds the texture bounds")
  assertTrue(origin.y + extent.height <= levelSize.height, "Texture copy height exceeds the texture bounds")

  if (texture.type === TextureType.Texture2D) {
    assertTrue(origin.z === 0, "2D texture copies cannot use a Z origin")
    assertTrue(extent.depthOrArrayLayers === 1, "2D texture copies can only cover one layer")
    return
  }

  assertTrue(
    origin.z + extent.depthOrArrayLayers <= maxDepth,
    "Texture copy depth exceeds the texture bounds"
  )
}

/**
 * @param {WebGLImageCopyBuffer} buffer
 * @param {NormalizedWebGLExtent3D} extent
 * @param {number} pixelSize
 */
function resolveBufferLayout(buffer, extent, pixelSize) {
  const offset = buffer.offset ?? 0
  const rowSize = extent.width * pixelSize
  const bytesPerRow = buffer.bytesPerRow ?? rowSize
  const rowsPerImage = buffer.rowsPerImage ?? extent.height

  assertTrue(Number.isInteger(offset) && offset >= 0, `Invalid buffer copy offset ${offset}`)
  assertTrue(Number.isInteger(bytesPerRow) && bytesPerRow > 0, `Invalid bytesPerRow ${bytesPerRow}`)
  assertTrue(Number.isInteger(rowsPerImage) && rowsPerImage > 0, `Invalid rowsPerImage ${rowsPerImage}`)
  assertTrue(bytesPerRow >= rowSize, `bytesPerRow must be at least ${rowSize}`)
  assertTrue(bytesPerRow % pixelSize === 0, "bytesPerRow must be a multiple of the texel size")
  assertTrue(rowsPerImage >= extent.height, `rowsPerImage must be at least ${extent.height}`)

  const layerStride = bytesPerRow * rowsPerImage
  const requiredSize = offset + layerStride * extent.depthOrArrayLayers

  assertTrue(requiredSize <= buffer.buffer.size, "Buffer copy range exceeds the buffer size")

  return {
    offset,
    bytesPerRow,
    rowsPerImage,
    layerStride
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {GLenum} framebufferTarget
 * @param {GLenum} attachment
 * @param {GPUTexture} texture
 * @param {number} mipLevel
 * @param {number} layer
 * @param {GLenum} [cubeFace]
 */
function attachTextureToFramebuffer(context, framebufferTarget, attachment, texture, mipLevel, layer, cubeFace) {
  switch (texture.type) {
    case TextureType.Texture2D:
      context.framebufferTexture2D(
        framebufferTarget,
        attachment,
        context.TEXTURE_2D,
        texture.inner,
        mipLevel
      )
      break
    case TextureType.TextureCubeMap: {
      const faceTarget = cubeFace ?? getCubeFaceTarget(context, layer)
      context.framebufferTexture2D(
        framebufferTarget,
        attachment,
        faceTarget,
        texture.inner,
        mipLevel
      )
      break
    }
    case TextureType.Texture2DArray:
    case TextureType.Texture3D:
      context.framebufferTextureLayer(
        framebufferTarget,
        attachment,
        texture.inner,
        mipLevel,
        layer
      )
      break
    default:
      throw new Error("Texture type is not supported by the command encoder")
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {number} layer
 */
function getCubeFaceTarget(context, layer) {
  assertTrue(Number.isInteger(layer) && layer >= 0 && layer < 6, `Invalid cube-map face ${layer}`)
  return context.TEXTURE_CUBE_MAP_POSITIVE_X + layer
}

/**
 * @param {GPUTexture} texture
 */
function getTextureCopyPixelSize(texture) {
  if (texture.actualFormat === TextureFormat.Depth32FloatStencil8) {
    return 8
  }

  return texture.pixelSize
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {GLenum} target
 * @param {string} label
 */
function assertFramebufferComplete(context, target, label) {
  const status = context.checkFramebufferStatus(target)

  assertTrue(
    status === context.FRAMEBUFFER_COMPLETE,
    `${label} framebuffer is incomplete: ${status}`
  )
}

/**
 * @param {GPUBuffer} source
 * @param {number} offset
 * @param {number} size
 * @param {"source" | "destination"} label
 */
function assertBufferRange(source, offset, size, label) {
  assertTrue(Number.isInteger(offset) && offset >= 0, `Invalid ${label} buffer offset ${offset}`)
  assertTrue(Number.isInteger(size) && size >= 0, `Invalid copy size ${size}`)
  assertTrue(offset + size <= source.size, `The ${label} buffer range exceeds the buffer size`)
}

/**
 * @param {GPUBuffer} source
 * @param {number} sourceOffset
 * @param {GPUBuffer} destination
 * @param {number} destinationOffset
 * @param {number} size
 */
function assertNoBufferOverlap(source, sourceOffset, destination, destinationOffset, size) {
  if (source !== destination) {
    return
  }

  const sourceEnd = sourceOffset + size
  const destinationEnd = destinationOffset + size
  const overlaps = sourceOffset < destinationEnd && destinationOffset < sourceEnd

  assertTrue(!overlaps, "Buffer copies cannot overlap when source and destination are the same buffer")
}
