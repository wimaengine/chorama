import { UniformBuffer } from "../../../core/resources/index.js"
import { snapUp } from "../../../math/index.js"

/**
 * CPU-side payload for the tonemapping exposure block.
 *
 * Each view gets its own aligned slot in the backing buffer so the render pass
 * can use dynamic offsets when binding exposure data.
 */
export class TonemappingUniform {
  /**
   * std140 keeps a single float block aligned to a 16-byte slot.
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
      TonemappingUniform.BlockSize,
      renderDevice.limits.minUniformBufferOffsetAlignment
    )
  }

  /**
   * Size of a single exposure slot in the shared buffer.
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
    this.bindingSize = TonemappingUniform.getBindingSize(renderDevice)
  }

  /**
   * Writes a camera exposure into the slot at the requested view index.
   * @param {number} viewIndex
   * @param {number} exposure
   * @returns {number} The dynamic offset for the slot.
   */
  setExposure(viewIndex, exposure) {
    const offset = viewIndex * this.bindingSize
    const data = this.#ensureCapacity(offset + this.bindingSize)

    new DataView(data).setFloat32(offset, exposure, true)
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
