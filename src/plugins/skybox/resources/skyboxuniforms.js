import { NewUniformBuffer } from "../../../core/resources/index.js"
/** @import { SkyBox } from "../../../objects/index.js" */

/**
 * Per-skybox CPU-side uniform payloads used by the renderer's GPU cache.
 */
export class SkyBoxUniforms {
  /**
   * @type {WeakMap<SkyBox, NewUniformBuffer>}
   */
  buffers = new WeakMap()

  /**
   * Returns the existing buffer for a skybox, if any.
   * @param {SkyBox} skybox
   * @returns {NewUniformBuffer | undefined}
   */
  get(skybox) {
    return this.buffers.get(skybox)
  }

  /**
   * Returns a buffer for the requested skybox, creating it if needed.
   * The backing `ArrayBuffer` is grown to at least `minSize`.
   * @param {SkyBox} skybox
   * @param {number} [minSize=0]
   * @returns {NewUniformBuffer}
   */
  getOrSet(skybox, minSize = 0) {
    const existing = this.get(skybox)

    if (existing && existing.size >= minSize) {
      return existing
    }

    const next = new NewUniformBuffer(new ArrayBuffer(minSize))

    if (existing) {
      new Uint8Array(next.data).set(
        new Uint8Array(existing.data, 0, Math.min(existing.data.byteLength, next.data.byteLength))
      )
    }

    this.buffers.set(skybox, next)
    return next
  }

  /**
   * Updates a skybox payload and returns its buffer record.
   * @param {SkyBox} skybox
   * @param {ArrayBuffer} data
   * @param {number} [minSize=data.byteLength]
   * @returns {NewUniformBuffer}
   */
  setData(skybox, data, minSize = data.byteLength) {
    const size = Math.max(minSize, data.byteLength)
    const buffer = this.getOrSet(skybox, size)

    if (buffer.data.byteLength === data.byteLength) {
      buffer.data = data
      return buffer
    }

    const nextData = new ArrayBuffer(buffer.data.byteLength)
    new Uint8Array(nextData).set(new Uint8Array(data))
    buffer.data = nextData
    return buffer
  }
}
