import { Affine3 } from "../../math/index.js"

/**
 * CPU-side payload for a single mesh-instance uniform block.
 */
export class MeshInstanceUniform {
  /**
   * Raw std140 payload size for one mesh-instance block.
   * @readonly
   * @type {number}
   */
  static MorphTargetWeightVectors = 4

  /**
   * Maximum number of morph targets supported by the packed UBO payload.
   * @readonly
   * @type {number}
   */
  static MorphTargetCount = MeshInstanceUniform.MorphTargetWeightVectors * 4

  /**
   * Raw std140 payload size for one mesh-instance block.
   * @readonly
   * @type {number}
   */
  static BlockSize = (16 + 4 + MeshInstanceUniform.MorphTargetWeightVectors * 4) * Float32Array.BYTES_PER_ELEMENT

  /**
   * Creates a mesh-instance payload from a 2D affine transform.
   *
   * The 2D transform occupies the XY plane and the object's z-index becomes
   * the promoted affine's Z translation so the existing MeshInstanceBlock can
   * be reused by the 2D pipeline.
   *
   * @param {import("hisabati").Affine2} transform
   * @param {number} [zIndex=0]
   * @returns {MeshInstanceUniform}
   */
  static from2D(transform, zIndex = 0) {
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

    return new MeshInstanceUniform({
      transform: promotedTransform
    })
  }

  /**
   * Current world transform for the instance.
   * @type {Affine3}
   */
  transform

  /**
   * Bone texture row offset for the instance skin.
   * @type {number}
   */
  skinIndex = 0

  /**
   * Number of bones available for the instance skin.
   * @type {number}
   */
  boneCount = 0

  /**
   * Number of morph targets exposed by the mesh.
   * @type {number}
   */
  morphTargetCount = 0

  /**
   * Packed morph weights for up to {@link MeshInstanceUniform.MorphTargetCount} targets.
   * @type {number[]}
   */
  morphWeights = []

  /**
   * @param {MeshInstanceUniformOptions} options
   */
  constructor({
    transform,
    skinIndex = 0,
    boneCount = 0,
    morphTargetCount = 0,
    morphWeights = []
  }) {
    this.transform = transform
    this.skinIndex = skinIndex
    this.boneCount = boneCount
    this.morphTargetCount = Math.min(morphTargetCount, MeshInstanceUniform.MorphTargetCount)
    this.morphWeights = morphWeights.slice(0, MeshInstanceUniform.MorphTargetCount)
  }

  /**
   * Packs the current state into the supplied block slice.
   *
   * @param {DataView} data
   */
  getData(data) {
    const matrix = Affine3.toMatrix4(this.transform)
    const floats = new Float32Array(data.buffer, data.byteOffset, MeshInstanceUniform.BlockSize / Float32Array.BYTES_PER_ELEMENT)
    const metadata = new Uint32Array(data.buffer, data.byteOffset, MeshInstanceUniform.BlockSize / Uint32Array.BYTES_PER_ELEMENT)

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

    metadata[16] = this.skinIndex >>> 0
    metadata[17] = this.boneCount >>> 0
    metadata[18] = this.morphTargetCount >>> 0

    const weightCount = Math.min(
      this.morphTargetCount,
      this.morphWeights.length,
      MeshInstanceUniform.MorphTargetCount
    )

    for (let i = 0; i < weightCount; i++) {
      floats[20 + i] = this.morphWeights[i] ?? 0
    }
  }
}

/**
 * @typedef MeshInstanceUniformOptions
 * @property {Affine3} transform
 * @property {number} [skinIndex=0]
 * @property {number} [boneCount=0]
 * @property {number} [morphTargetCount=0]
 * @property {number[]} [morphWeights=[]]
 */
