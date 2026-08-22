import { Affine3 } from "../../../math/index.js"
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
   * @type {Map<import("../../../objects/index.js").Skin, BoneTextureSlot>}
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
   * @param {import("../../../objects/index.js").Skin} skin
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
   * @param {import("../../../objects/index.js").Skin} skin
   * @returns {BoneTextureSlot}
   */
  collect(skin) {
    const slot = this.getOrAllocate(skin)
    const { bones, inverseBindPose } = skin
    if (bones.length === 0) {
      return slot
    }

    const buffer = this.#ensureCapacity(slot.index + bones.length)
    const boneTransforms = new Float32Array(buffer)
    for (let i = 0; i < bones.length; i++) {
      const offset = (slot.index + i) * 16
      const bone = /** @type {import("../../../objects/index.js").Bone3D} */ (bones[i])
      const pose = /** @type {Affine3} */ (inverseBindPose[i] || new Affine3())
      const world = Affine3.multiply(
        bone.transform.world,
        pose
      )

      boneTransforms[offset + 0] = world.a
      boneTransforms[offset + 1] = world.b
      boneTransforms[offset + 2] = world.c
      boneTransforms[offset + 3] = 0
      boneTransforms[offset + 4] = world.d
      boneTransforms[offset + 5] = world.e
      boneTransforms[offset + 6] = world.f
      boneTransforms[offset + 7] = 0
      boneTransforms[offset + 8] = world.g
      boneTransforms[offset + 9] = world.h
      boneTransforms[offset + 10] = world.i
      boneTransforms[offset + 11] = 0
      boneTransforms[offset + 12] = world.x
      boneTransforms[offset + 13] = world.y
      boneTransforms[offset + 14] = world.z
      boneTransforms[offset + 15] = 1
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
 * @typedef BoneTextureSlot
 * @property {number} index
 * @property {number} boneCount
 */
