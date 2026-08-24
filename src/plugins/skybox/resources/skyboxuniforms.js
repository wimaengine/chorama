import { UniformBuffer } from "../../../core/resources/index.js"
import { Affine3 } from "../../../math/index.js"
/** @import { SkyBox } from "../../../objects/index.js" */

/**
 * Per-skybox CPU-side uniform payloads used by the renderer's GPU cache.
 */
export class SkyBoxUniforms {
  /**
   * std140 packs the model matrix and lerp into a fixed 80-byte block.
   * @readonly
   * @type {number}
   */
  static BlockSize = 20 * Float32Array.BYTES_PER_ELEMENT

  /**
   * @type {WeakMap<SkyBox, UniformBuffer>}
   */
  buffers = new WeakMap()

  /**
   * Returns the existing buffer for a skybox, if any.
   * @param {SkyBox} skybox
   * @returns {UniformBuffer | undefined}
   */
  get(skybox) {
    return this.buffers.get(skybox)
  }

  /**
   * Returns a buffer for the requested skybox, creating it if needed.
   * The backing `ArrayBuffer` is grown to at least `minSize`.
   * @param {SkyBox} skybox
   * @param {number} [minSize=0]
   * @returns {UniformBuffer}
   */
  getOrSet(skybox, minSize = 0) {
    const existing = this.get(skybox)

    if (existing && existing.size >= minSize) {
      return existing
    }

    const next = new UniformBuffer(new ArrayBuffer(minSize))

    this.buffers.set(skybox, next)
    return next
  }

  /**
   * Packs a skybox payload into its cached primary buffer and returns it.
   *
   * @param {SkyBox} skybox
   * @returns {UniformBuffer}
   */
  setData(skybox) {
    const buffer = this.getOrSet(skybox, SkyBoxUniforms.BlockSize)
    const data = buffer.data
    const floats = new Float32Array(data)
    const transformMatrix = Affine3.toMatrix4(skybox.transform.world)

    new Uint8Array(data).fill(0)

    floats[0] = transformMatrix.a
    floats[1] = transformMatrix.b
    floats[2] = transformMatrix.c
    floats[3] = transformMatrix.d
    floats[4] = transformMatrix.e
    floats[5] = transformMatrix.f
    floats[6] = transformMatrix.g
    floats[7] = transformMatrix.h
    floats[8] = transformMatrix.i
    floats[9] = transformMatrix.j
    floats[10] = transformMatrix.k
    floats[11] = transformMatrix.l
    floats[12] = transformMatrix.m
    floats[13] = transformMatrix.n
    floats[14] = transformMatrix.o
    floats[15] = transformMatrix.p
    floats[16] = skybox.lerp

    buffer.data = data
    return buffer
  }
}
