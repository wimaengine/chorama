import { GPUBuffer } from "./gpubuffer"

export class GPUMesh {
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
   * @param {WebGLVertexArrayObject} vao
   * @param {number} count
   * @param {number} layoutHash
   */
  constructor(vao, count, layoutHash) {
    this.inner = vao
    this.count = count
    this.layoutHash = layoutHash
  }
}