import { UniformBuffer } from "../../../core/resources/index.js"
import { snapUp } from "../../../math/index.js"

/**
 * CPU-side payload for bloom threshold, intensity, and soft knee.
 */
export class BloomUniform {
  /**
   * std140 keeps the block aligned to a 16-byte slot.
   * @type {number}
   */
  static BlockSize = 16

  /**
   * Returns the size of one dynamically offset slot for the current device.
   * @param {import("../../../core/index.js").WebGLRenderDevice} renderDevice
   * @returns {number}
   */
  static getBindingSize(renderDevice) {
    return snapUp(
      BloomUniform.BlockSize,
      renderDevice.limits.minUniformBufferOffsetAlignment
    )
  }

  /**
   * Size of a single bloom slot in the shared buffer.
   * @readonly
   * @type {number}
   */
  bindingSize

  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer()

  /**
   * @param {import("../../../core/index.js").WebGLRenderDevice} renderDevice
   */
  constructor(renderDevice) {
    this.bindingSize = BloomUniform.getBindingSize(renderDevice)
  }

  /**
   * Writes a bloom payload into the slot at the requested view index.
   * @param {number} viewIndex
   * @param {import("../../../objects/index.js").Bloom} bloom
   * @returns {number} The dynamic offset for the slot.
   */
  setBloom(viewIndex, bloom) {
    const offset = viewIndex * this.bindingSize
    const data = this.#ensureCapacity(offset + this.bindingSize)
    const view = new DataView(data)

    view.setFloat32(offset, bloom.threshold, true)
    view.setFloat32(offset + 4, bloom.intensity, true)
    view.setFloat32(offset + 8, bloom.softKnee, true)

    this.buffer.data = data

    return offset
  }

  /**
   * @param {number} minSize
   * @returns {ArrayBuffer}
   */
  #ensureCapacity(minSize) {
    const data = this.buffer.data

    if (data.byteLength >= minSize) {
      return data
    }

    const next = new ArrayBuffer(minSize)
    new Uint8Array(next).set(new Uint8Array(data))
    return next
  }
}
