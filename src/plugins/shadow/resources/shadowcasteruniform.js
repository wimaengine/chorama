import { UniformBuffer } from "../../../core/resources/index.js"

export const MAX_SHADOW_CASTERS = 10
export const SHADOW_CASTER_BYTE_SIZE = 96

export class ShadowCasterUniformBuffer {
  static BlockSize = SHADOW_CASTER_BYTE_SIZE * MAX_SHADOW_CASTERS

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer(new ArrayBuffer(ShadowCasterUniformBuffer.BlockSize))

  /**
   * Replaces the backing payload with the provided fixed-size data.
   *
   * @param {ArrayBuffer} data
   */
  setData(data) {
    this.buffer.data = data
  }
}
