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
   * Backing buffer reused whenever the payload is packed.
   * @type {ArrayBuffer}
   */
  #data = new ArrayBuffer(MeshInstanceUniform.BlockSize)

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
   * Packs the current state into the block buffer.
   *
   * @returns {ArrayBuffer}
   */
  getData() {
    const data = this.#data
    new Float32Array(data, 0, 16).set([...Affine3.toMatrix4(this.transform)])

    const metadata = new Uint32Array(data)
    metadata[16] = this.skinIndex >>> 0
    metadata[17] = this.boneCount >>> 0

    return data
  }
}

/**
 * @typedef MeshInstanceUniformOptions
 * @property {Affine3} transform
 * @property {number} [skinIndex=0]
 * @property {number} [boneCount=0]
 */
