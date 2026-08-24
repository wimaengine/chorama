import { UniformBuffer } from "../../../core/resources/index.js"

const FLOAT_BYTES = Float32Array.BYTES_PER_ELEMENT

export const MAX_DIRECTIONAL_LIGHTS = 10
export const MAX_POINT_LIGHTS = 10
export const MAX_SPOT_LIGHTS = 10

export class AmbientLightUniformBuffer {
  static BlockSize = 8 * FLOAT_BYTES

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer(new ArrayBuffer(AmbientLightUniformBuffer.BlockSize))

  /**
   * Replaces the backing payload with the provided fixed-size data.
   *
   * @param {ArrayBuffer} data
   */
  setData(data) {
    this.buffer.data = data
  }
}

export class DirectionalLightUniformBuffer {
  static BlockSize = (4 + MAX_DIRECTIONAL_LIGHTS * 12) * FLOAT_BYTES

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer(new ArrayBuffer(DirectionalLightUniformBuffer.BlockSize))

  /**
   * Replaces the backing payload with the provided fixed-size data.
   *
   * @param {ArrayBuffer} data
   */
  setData(data) {
    this.buffer.data = data
  }
}

export class PointLightUniformBuffer {
  static BlockSize = (4 + MAX_POINT_LIGHTS * 12) * FLOAT_BYTES

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer(new ArrayBuffer(PointLightUniformBuffer.BlockSize))

  /**
   * Replaces the backing payload with the provided fixed-size data.
   *
   * @param {ArrayBuffer} data
   */
  setData(data) {
    this.buffer.data = data
  }
}

export class SpotLightUniformBuffer {
  static BlockSize = (4 + MAX_SPOT_LIGHTS * 16) * FLOAT_BYTES

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer(new ArrayBuffer(SpotLightUniformBuffer.BlockSize))

  /**
   * Replaces the backing payload with the provided fixed-size data.
   *
   * @param {ArrayBuffer} data
   */
  setData(data) {
    this.buffer.data = data
  }
}
