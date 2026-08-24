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

    this.buffers.set(material, next)
    return next
  }

  /**
   * Packs a material payload into its cached primary buffer and returns it.
   *
   * @param {RawMaterial} material
   * @param {number} [minSize=0]
   * @returns {UniformBuffer}
   */
  setData(material, minSize = 0) {
    const buffer = this.getOrSet(material, minSize)
    const data = buffer.data

    new Uint8Array(data).fill(0)
    material.getData(new DataView(data))
    buffer.data = data
    return buffer
  }
}
