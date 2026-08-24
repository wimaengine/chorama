import { GPUBuffer } from "./gpubuffer"

/**
 * @typedef {object} GPUMeshVertexBufferBinding
 * @property {GPUBuffer} buffer
 * @property {number} [offset=0]
 * @property {number} [size]
 */

/**
 * @typedef {"uint16" | "uint32"} GPUMeshIndexFormat
 */

export class GPUMesh {
  /**
   * @type {boolean}
   */
  #destroyed = false

  /**
   * @type {GPUMeshVertexBufferBinding[]}
   */
  vertexBuffers = []

  /**
   * @type {GPUBuffer | undefined}
   */
  indexBuffer

  /**
   * @type {GPUMeshIndexFormat | undefined}
   */
  indexFormat

  /**
   * @type {number}
   */
  count = 0

  /**
   * @type {number}
   */
  layoutHash = 0

  /**
   * @param {object} [descriptor]
   * @param {GPUMeshVertexBufferBinding[]} [descriptor.vertexBuffers]
   * @param {GPUBuffer} [descriptor.indexBuffer]
   * @param {GPUMeshIndexFormat} [descriptor.indexFormat]
   * @param {number} [descriptor.count]
   * @param {number} [descriptor.layoutHash]
   */
  constructor({
    vertexBuffers = [],
    indexBuffer,
    indexFormat,
    count = 0,
    layoutHash = 0
  } = {}) {
    this.vertexBuffers = [...vertexBuffers]
    this.indexBuffer = indexBuffer
    this.indexFormat = indexFormat
    this.count = count
    this.layoutHash = layoutHash
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    for (const binding of this.vertexBuffers) {
      binding.buffer.destroy()
    }

    if (this.indexBuffer) {
      this.indexBuffer.destroy()
    }

    this.vertexBuffers.length = 0
    this.indexBuffer = undefined
    this.indexFormat = undefined
    this.count = 0
    this.#destroyed = true
  }
}
