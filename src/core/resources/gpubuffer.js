import { BufferType } from "../../constants/index.js"

export class GPUBuffer {
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
   * @type {WebGLBuffer}
   */
  inner

  /**
   * @readonly
   * @type {BufferType}
   */
  type

  /**
   * @readonly
   * @type {number}
   */
  size

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLBuffer} buffer
   * @param {number} type
   * @param {number} size
   */
  constructor(context, buffer, type, size) {
    this.#context = context
    this.inner = buffer
    this.type = type
    this.size = size
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#context.deleteBuffer(this.inner)
    this.#destroyed = true
  }
}
