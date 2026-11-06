import { Affine2, Affine3 } from "../../../math/index.js"
import { TextureFormat, TextureType, getTextureFormatSize } from "../../../constants/index.js"
import { Texture } from "../../../texture/index.js"

export class BoneTextureResource {
  /**
   * @param {import("../../../core/limits.js").WebGLDeviceLimits} limits
   */
  constructor(limits) {
    this.texture = new Texture({
      type: TextureType.Texture2DArray,
      width: 4,
      height: 1,
      depth: 1,
      format: TextureFormat.RGBA32Float,
      data: [new ArrayBuffer(0)]
    })

    this.#maxHeight = limits.maxTextureDimension2D
    this.#maxLayers = limits.maxTextureArrayLayers
 
  }

  /**
   * GPU-facing texture descriptor owned by the shared cache.
   * @type {Texture}
   */
  texture

  /**
   * @type {Map<import("../../../objects/index.js").Skin2D | import("../../../objects/index.js").Skin3D, BoneTextureSlot>}
   */
  #slots = new Map()

  /**
   * @type {number}
   */
  #maxHeight

  /**
   * @type {number}
   */
  #maxLayers

  /**
   * @param {import("../../../objects/index.js").Skin2D | import("../../../objects/index.js").Skin3D} skin
   * @returns {BoneTextureSlot}
   */
  getOrAllocate(skin) {
    const boneCount = skin.bones.length
    const existing = this.#slots.get(skin)

    if (existing && existing.boneCount === boneCount) {
      return existing
    }

    if (existing) {
      this.#slots.delete(skin)
    }

    const slot = {
      index: this.#getRowCount(),
      boneCount
    }

    if (boneCount > 0) {
      this.#ensureCapacity(slot.index + boneCount)
    }

    this.#slots.set(skin, slot)
    return slot
  }

  /**
   * Collects a 2D skin into the shared bone texture.
   *
   * @param {import("../../../objects/index.js").Skin2D} skin
   * @returns {BoneTextureSlot}
   */
  collect2D(skin) {
    const slot = this.getOrAllocate(skin)
    const { bones, inverseBindPose } = skin
    if (bones.length === 0) {
      return slot
    }

    const buffer = this.#ensureCapacity(slot.index + bones.length)
    const boneTransforms = new Float32Array(buffer)
    for (let i = 0; i < bones.length; i++) {
      const offset = (slot.index + i) * 16
      const bone = bones[i]
      if (!bone) {
        continue
      }
      const pose = /** @type {Affine2} */ (inverseBindPose[i] || new Affine2())
      const world = Affine2.multiply(bone.transform.world, pose)
      writeAffine2(boneTransforms, offset, world)
    }

    this.texture.data = [buffer]
    return slot
  }

  /**
   * Collects a 3D skin into the shared bone texture.
   *
   * @param {import("../../../objects/index.js").Skin3D} skin
   * @returns {BoneTextureSlot}
   */
  collect3D(skin) {
    const slot = this.getOrAllocate(skin)
    const { bones, inverseBindPose } = skin
    if (bones.length === 0) {
      return slot
    }

    const buffer = this.#ensureCapacity(slot.index + bones.length)
    const boneTransforms = new Float32Array(buffer)
    for (let i = 0; i < bones.length; i++) {
      const offset = (slot.index + i) * 16
      const bone = bones[i]
      if (!bone) {
        continue
      }
      const pose = /** @type {Affine3} */ (inverseBindPose[i] || new Affine3())
      const world = Affine3.multiply(bone.transform.world, pose)
      writeAffine3(boneTransforms, offset, world)
    }

    this.texture.data = [buffer]
    return slot
  }

  /**
   * @param {number} rows
   * @returns {ArrayBuffer}
   */
  #ensureCapacity(rows) {
    const currentBuffer = this.texture.data[0]
    const currentRows = currentBuffer ? currentBuffer.byteLength / this.#rowSizeBytes() : 0

    if (rows <= currentRows) {
      return /** @type {ArrayBuffer} */ (currentBuffer ?? new ArrayBuffer(0))
    }

    const nextHeight = Math.min(rows, this.#maxHeight)
    const nextDepth = Math.ceil(rows / nextHeight)

    if (nextDepth > this.#maxLayers) {
      throw new Error("Bone texture array capacity exceeded")
    }

    const nextCapacityRows = nextHeight * nextDepth
    const nextBuffer = new ArrayBuffer(nextCapacityRows * this.#rowSizeBytes())
    if (currentBuffer) {
      new Uint8Array(nextBuffer).set(new Uint8Array(currentBuffer))
    }

    this.texture.height = nextHeight
    this.texture.depth = nextDepth

    this.texture.data = [nextBuffer]
    return nextBuffer
  }

  /**
   * @returns {number}
   */
  #rowSizeBytes() {
    return this.texture.width * getTextureFormatSize(this.texture.format)
  }

  /**
   * Returns the number of populated bone rows currently stored in the texture buffer.
   * @returns {number}
   */
  #getRowCount() {
    let rows = 0

    for (const slot of this.#slots.values()) {
      rows = Math.max(rows, slot.index + slot.boneCount)
    }

    return rows
  }
}

/**
 * Writes a 2D affine as a 4x4 matrix in column-major order. The transform
 * occupies the XY plane and leaves Z unchanged.
 *
 * @param {Float32Array} data
 * @param {number} offset
 * @param {Affine2} affine
 */
function writeAffine2(data, offset, affine) {
  data[offset + 0] = affine.a
  data[offset + 1] = affine.b
  data[offset + 2] = 0
  data[offset + 3] = 0
  data[offset + 4] = affine.c
  data[offset + 5] = affine.d
  data[offset + 6] = 0
  data[offset + 7] = 0
  data[offset + 8] = 0
  data[offset + 9] = 0
  data[offset + 10] = 1
  data[offset + 11] = 0
  data[offset + 12] = affine.x
  data[offset + 13] = affine.y
  data[offset + 14] = 0
  data[offset + 15] = 1
}

/**
 * @param {Float32Array} data
 * @param {number} offset
 * @param {Affine3} affine
 */
function writeAffine3(data, offset, affine) {
  data[offset + 0] = affine.a
  data[offset + 1] = affine.b
  data[offset + 2] = affine.c
  data[offset + 3] = 0
  data[offset + 4] = affine.d
  data[offset + 5] = affine.e
  data[offset + 6] = affine.f
  data[offset + 7] = 0
  data[offset + 8] = affine.g
  data[offset + 9] = affine.h
  data[offset + 10] = affine.i
  data[offset + 11] = 0
  data[offset + 12] = affine.x
  data[offset + 13] = affine.y
  data[offset + 14] = affine.z
  data[offset + 15] = 1
}

/**
 * @typedef BoneTextureSlot
 * @property {number} index
 * @property {number} boneCount
 */
