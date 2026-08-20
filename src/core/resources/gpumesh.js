import { GPUBuffer } from "./gpubuffer"

export class GPUMesh {
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
   * @type {WebGLVertexArrayObject}
   */
  inner

  /**
   * @type {GPUBuffer[]}
   */
  attributeBuffers = []

  /**
   * @type {GPUBuffer | undefined}
   */
  indexBuffer

  /**
   * @type {GLenum | undefined}
   */
  indexType

  /**
   * @type {number}
   */
  count

  /**
   * @type {number}
   */
  layoutHash

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLVertexArrayObject} vao
   * @param {number} count
   * @param {number} layoutHash
   */
  constructor(context, vao, count, layoutHash) {
    this.#context = context
    this.inner = vao
    this.count = count
    this.layoutHash = layoutHash
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    for (const buffer of this.attributeBuffers) {
      buffer.destroy()
    }

    if (this.indexBuffer) {
      this.indexBuffer.destroy()
    }

    this.#context.deleteVertexArray(this.inner)
    this.attributeBuffers.length = 0
    this.indexBuffer = undefined
    this.#destroyed = true
  }
}
