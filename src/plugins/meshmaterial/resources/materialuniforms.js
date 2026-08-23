import { UniformBuffer } from "../../../core/resources/index.js"
/** @import { RawMaterial } from "../../../material/index.js" */

export class MaterialUniforms {
  /**
   * @type {Map<RawMaterial, UniformBuffer>}
   */
  buffers = new Map()

  /**
   * Returns the existing buffer for a material, if any.
   * @param {RawMaterial} material
   * @returns {UniformBuffer | undefined}
   */
  get(material) {
    return this.buffers.get(material)
  }

  /**
   * Returns a buffer for the material, creating it if needed.
   * The backing `ArrayBuffer` is grown to at least `minSize`.
   * @param {RawMaterial} material
   * @param {number} [minSize=0]
   * @returns {UniformBuffer}
   */
  getOrSet(material, minSize = 0) {
    const existing = this.get(material)

    if (existing && existing.size >= minSize) {
      return existing
    }

    const next = new UniformBuffer(new ArrayBuffer(minSize))

    if (existing) {
      new Uint8Array(next.data).set(
        new Uint8Array(existing.data, 0, Math.min(existing.data.byteLength, next.data.byteLength))
      )
    }

    this.buffers.set(material, next)
    return next
  }

  /**
   * Updates a material payload and returns its buffer record.
   * @param {RawMaterial} material
   * @param {ArrayBuffer} data
   * @param {number} [minSize=data.byteLength]
   * @returns {UniformBuffer}
   */
  setData(material, data, minSize = data.byteLength) {
    const size = Math.max(minSize, data.byteLength)
    const buffer = this.getOrSet(material, size)

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
