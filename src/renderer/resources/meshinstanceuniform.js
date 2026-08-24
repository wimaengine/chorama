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
  static BlockSize = 80

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
   * @param {MeshInstanceUniformOptions} options
   */
  constructor({
    transform,
    skinIndex = 0,
    boneCount = 0
  }) {
    this.transform = transform
    this.skinIndex = skinIndex
    this.boneCount = boneCount
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
  }
}

/**
 * @typedef MeshInstanceUniformOptions
 * @property {Affine3} transform
 * @property {number} [skinIndex=0]
 * @property {number} [boneCount=0]
 */
