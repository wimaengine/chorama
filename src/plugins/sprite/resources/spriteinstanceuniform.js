import { Affine3, Color } from "../../../math/index.js"

/**
 * CPU-side payload for a single sprite-instance uniform block.
 */
export class SpriteInstanceUniform {
  /**
   * Raw std140 payload size for one sprite-instance block.
   *
   * The final four bytes are followed by the std140 padding required to keep
   * the block size aligned to a four-component vector.
   *
   * @readonly
   * @type {number}
   */
  static BlockSize = (16 + 4 + 4 + 4) * Float32Array.BYTES_PER_ELEMENT

  /**
   * Creates a sprite-instance payload from a 2D affine transform.
   *
   * @param {import("hisabati").Affine2} transform
   * @param {number} [zIndex=0]
   * @param {[number, number, number, number]} [uvRect]
   * @param {Color} [tint]
   * @param {number} [alphaCutoff=0.5]
   * @returns {SpriteInstanceUniform}
   */
  static from2D(transform, zIndex = 0, uvRect, tint = new Color(1, 1, 1), alphaCutoff = 0.5) {
    const promotedTransform = new Affine3(
      transform.a,
      transform.c,
      0,
      transform.x,
      transform.b,
      transform.d,
      0,
      transform.y,
      0,
      0,
      1,
      zIndex
    )

    return new SpriteInstanceUniform({
      transform: promotedTransform,
      uvRect,
      tint,
      alphaCutoff
    })
  }

  /**
   * Current world transform for the instance.
   * @type {Affine3}
   */
  transform

  /**
   * Normalized lower-left/upper-right UV rectangle.
   * @type {[number, number, number, number]}
   */
  uvRect

  /**
   * Color multiplied with the sampled image.
   * @type {Color}
   */
  tint

  /**
   * Alpha cutoff used by the alpha-mask shader variant.
   * @type {number}
   */
  alphaCutoff

  /**
   * @param {SpriteInstanceUniformOptions} options
   */
  constructor({
    transform,
    uvRect = [0, 0, 1, 1],
    tint = new Color(1, 1, 1),
    alphaCutoff = 0.5
  }) {
    this.transform = transform
    this.uvRect = [uvRect[0], uvRect[1], uvRect[2], uvRect[3]]
    this.tint = tint
    this.alphaCutoff = alphaCutoff
  }

  /**
   * Packs the current state into the supplied block slice.
   *
   * @param {DataView} data
   */
  getData(data) {
    const matrix = Affine3.toMatrix4(this.transform)
    const floats = new Float32Array(data.buffer, data.byteOffset, SpriteInstanceUniform.BlockSize / Float32Array.BYTES_PER_ELEMENT)

    floats[0] = matrix.a
    floats[1] = matrix.b
    floats[2] = matrix.c
    floats[3] = matrix.d
    floats[4] = matrix.e
    floats[5] = matrix.f
    floats[6] = matrix.g
    floats[7] = matrix.h
    floats[8] = matrix.i
    floats[9] = matrix.j
    floats[10] = matrix.k
    floats[11] = matrix.l
    floats[12] = matrix.m
    floats[13] = matrix.n
    floats[14] = matrix.o
    floats[15] = matrix.p
    floats[16] = this.uvRect[0]
    floats[17] = this.uvRect[1]
    floats[18] = this.uvRect[2]
    floats[19] = this.uvRect[3]
    floats[20] = this.tint.r
    floats[21] = this.tint.g
    floats[22] = this.tint.b
    floats[23] = this.tint.a
    floats[24] = this.alphaCutoff
  }
}

/**
 * @typedef SpriteInstanceUniformOptions
 * @property {Affine3} transform
 * @property {[number, number, number, number]} [uvRect=[0, 0, 1, 1]]
 * @property {Color} [tint]
 * @property {number} [alphaCutoff=0.5]
 */
