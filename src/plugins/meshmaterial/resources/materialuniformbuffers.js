import { NewUniformBuffer } from "../../../core/resources/newuniformbuffer.js"
/** @import { RawMaterial } from "../../../material/index.js" */

/**
 * @typedef MaterialUniformBufferState
 * @property {NewUniformBuffer} materialBlock
 * @property {NewUniformBuffer | undefined} alphaMaskBlock
 */

export class MaterialUniformBuffers {
  /**
   * @type {Map<RawMaterial, MaterialUniformBufferState>}
   */
  buffers = new Map()

  /**
   * @param {RawMaterial} material
   * @returns {MaterialUniformBufferState}
   */
  #getState(material) {
    let state = this.buffers.get(material)

    if (!state) {
      state = {
        materialBlock: new NewUniformBuffer(),
        alphaMaskBlock: undefined
      }
      this.buffers.set(material, state)
    }

    return state
  }

  /**
   * Returns the existing buffer for a material block, if any.
   * @param {RawMaterial} material
   * @param {"materialBlock" | "alphaMaskBlock"} key
   * @returns {NewUniformBuffer | undefined}
   */
  get(material, key) {
    return this.#getState(material)[key]
  }

  /**
   * Returns a buffer for the requested material block, creating it if needed.
   * The backing `ArrayBuffer` is grown to at least `minSize`.
   * @param {RawMaterial} material
   * @param {"materialBlock" | "alphaMaskBlock"} key
   * @param {number} [minSize=0]
   * @returns {NewUniformBuffer}
   */
  getOrSet(material, key, minSize = 0) {
    const state = this.#getState(material)
    const existing = state[key]

    if (existing && existing.size >= minSize) {
      return existing
    }

    const next = new NewUniformBuffer(new ArrayBuffer(minSize))

    if (existing) {
      new Uint8Array(next.data).set(
        new Uint8Array(existing.data, 0, Math.min(existing.data.byteLength, next.data.byteLength))
      )
    }

    state[key] = next
    return next
  }

  /**
   * Updates a material block payload and returns its buffer record.
   * @param {RawMaterial} material
   * @param {"materialBlock" | "alphaMaskBlock"} key
   * @param {ArrayBuffer} data
   * @param {number} [minSize=data.byteLength]
   * @returns {NewUniformBuffer}
   */
  setData(material, key, data, minSize = data.byteLength) {
    const size = Math.max(minSize, data.byteLength)
    const buffer = this.getOrSet(material, key, size)

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
