/** @import { WebGLRenderDevice } from "../core/index.js" */
import { TextureFormat, TextureType, getTextureFormatSize } from "../constants/index.js"
import { getWebGLTextureFormat } from "../function.js"
import { assert } from "../utils/index.js"
import { GPUTexture } from "../core/resources/index.js"
import { RenderTarget } from "./rendertarget.js";

export class CanvasTarget extends RenderTarget {
  /**
   * @readonly
   * @type {HTMLCanvasElement}
   */
  canvas
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    super(canvas.width, canvas.height, 1)
    this.canvas = canvas
  }

  /**
   * Returns the native canvas framebuffer as a GPUTexture-shaped render
   * attachment. Its `inner` value is null because the framebuffer is owned by
   * the WebGL context rather than represented by a WebGLTexture.
   *
   * @param {WebGLRenderDevice} device
   * @returns {GPUTexture}
   */
  getCurrentTexture(device) {
    const format = TextureFormat.RGBA8Unorm
    const textureFormat = getWebGLTextureFormat(format)

    assert(textureFormat, "Invalid default framebuffer texture format")

    return new GPUTexture(
      device.context,
      null,
      TextureType.Texture2D,
      textureFormat,
      format,
      this.canvas.width,
      this.canvas.height,
      1,
      1,
      getTextureFormatSize(format)
    )
  }

  /**
   * @override
   */
  changed() {
    const rect = this.canvas.getBoundingClientRect()
    const resized = rect.width !== this.width ||
      rect.height !== this.height

    if (resized) {
      this.width = rect.width
      this.height = rect.height
      this.canvas.width = rect.width
      this.canvas.height = rect.height
    }
    return super.changed()
  }
}
