import { NewUniformBuffer } from "../../../core/resources/newuniformbuffer.js"
/** @import { Skin } from "../../../objects/index.js" */

/**
 * Per-skin CPU-side uniform payloads used by the renderer's GPU cache.
 */
export class SkinUniforms {
  /**
   * @type {Map<Skin, NewUniformBuffer>}
   */
  buffers = new Map()

  /**
   * Returns the existing buffer for a skin, if any.
   * @param {Skin} skin
   * @returns {NewUniformBuffer | undefined}
   */
  get(skin) {
    return this.buffers.get(skin)
  }

  /**
   * Returns a buffer for the requested skin, creating it if needed.
   * The backing `ArrayBuffer` is grown to at least `minSize`.
   * @param {Skin} skin
   * @param {number} [minSize=0]
   * @returns {NewUniformBuffer}
   */
  getOrSet(skin, minSize = 0) {
    const existing = this.get(skin)

    if (existing && existing.size >= minSize) {
      return existing
    }

    const next = new NewUniformBuffer(new ArrayBuffer(minSize))

    if (existing) {
      new Uint8Array(next.data).set(
        new Uint8Array(existing.data, 0, Math.min(existing.data.byteLength, next.data.byteLength))
      )
    }

    this.buffers.set(skin, next)
    return next
  }

  /**
   * Updates a skin payload and returns its buffer record.
   * @param {Skin} skin
   * @param {ArrayBuffer} data
   * @param {number} [minSize=data.byteLength]
   * @returns {NewUniformBuffer}
   */
  setData(skin, data, minSize = data.byteLength) {
    const size = Math.max(minSize, data.byteLength)
    const buffer = this.getOrSet(skin, size)

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
