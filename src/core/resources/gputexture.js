import { TextureFormat, TextureType } from "../../constants/index.js"
import { WebGLTextureFormat } from "../../function.js"

export class GPUTexture {
  /**
   * @type {WebGL2RenderingContext}
   */
  #context

  /**
   * @type {boolean}
   */
  #destroyed = false

  /**
   * @readonly
   * @type {WebGLTexture}
   */
  inner

  /**
   * @readonly
   * @type {TextureType}
   */
  type

  /**
   * @readonly
   * @type {number}
   */
  width

  /**
   * @readonly
   * @type {number}
   */
  height

  /**
   * @readonly
   * @type {number}
   */
  depth

  /**
   * @readonly
   * @type {number}
   */
  mipmapCount

  /**
   * @readonly
   * @type {WebGLTextureFormat}
   */
  format

  /**
   * @readonly
   * @type {TextureFormat}
   */
  actualFormat

  /**
   * @readonly
   * @type {number}
   */
  pixelSize

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLTexture} texture
   * @param {TextureType} type
   * @param {WebGLTextureFormat} format
   * @param {TextureFormat} actualFormat
   * @param {number} width
   * @param {number} height
   * @param {number} depth
   * @param {number} mipmapCount
   * @param {number} pixelSize
   */
  constructor(context, texture, type, format, actualFormat, width, height, depth, mipmapCount, pixelSize){
    this.#context = context
    this.inner = texture
    this.type = type
    this.format = format
    this.width = width
    this.height = height
    this.depth = depth
    this.mipmapCount = mipmapCount
    this.pixelSize = pixelSize
    this.actualFormat = actualFormat
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#context.deleteTexture(this.inner)
    this.#destroyed = true
  }
}
