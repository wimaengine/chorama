/**@import { WebGLWriteTextureDescriptor } from './descriptors.js' */
/** @import { GPUBuffer } from "../resources/index.js" */
import { TextureType } from "../../constants/index.js"
import { updateTexture2D, updateCubeMap, updateTexture2DArray } from "./utils.js"

/**
 * WebGPU-shaped upload queue for WebGL-backed devices.
 */
export class WebGLGPUQueue {
  /**
   * @private
   * @type {WebGL2RenderingContext}
   */
  context

  /**
   * @param {WebGL2RenderingContext} context
   */
  constructor(context) {
    this.context = context
  }

  /**
   * @param {GPUBuffer} buffer
   * @param {ArrayBuffer | ArrayBufferView} data
   * @param {number} bufferOffset
   * @param {number} dataOffset
   * @param {number} size
   */
  writeBuffer(buffer, data, bufferOffset = 0, dataOffset = 0, size = data.byteLength) {
    const { context } = this
    const source = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)

    context.bindBuffer(buffer.type, buffer.inner)
    context.bufferSubData(buffer.type, bufferOffset, source, dataOffset, size)
  }

  /**
   * @param {WebGLWriteTextureDescriptor} descriptor
   */
  writeTexture(descriptor) {
    const { texture } = descriptor
    const { context } = this

    context.bindTexture(texture.type, texture.inner)

    switch (texture.type) {
      case TextureType.Texture2D:
        updateTexture2D(context, descriptor)
        break
      case TextureType.TextureCubeMap:
        updateCubeMap(context, descriptor)
        break
      case TextureType.Texture2DArray:
        updateTexture2DArray(context, descriptor)
        break
      default:
        throw "Unsupported texture type."
    }
  }
}
