import { Affine3, Vector3 } from "../../../math/index.js"
import { TextureFormat, TextureType } from "../../../constants/index.js"
import { Texture } from "../../../texture/index.js"

export class BoneTextureResource {
  /**
   * @param {number} maxHeight
   * @param {number} maxLayers
   */
  constructor(maxHeight = 2048, maxLayers = 1) {
    this.#maxHeight = maxHeight
    this.#maxLayers = maxLayers
  }

  texture = new Texture({
    type: TextureType.Texture2DArray,
    width: 4,
    height: 0,
    depth: 0,
    format: TextureFormat.RGBA32Float,
  })

  /**
   * @type {WeakMap<import("../../../objects/index.js").Skin, BoneTextureSlot>}
   */
  #slots = new WeakMap()

  /**
   * @type {number}
   */
  #nextBoneRow = 0

  /**
   * @type {number}
   */
  #maxHeight

  /**
   * @type {number}
   */
  #maxLayers

  /**
   * CPU-side staging buffer for the shared bone texture.
   * @type {Float32Array}
   */
  #boneTransforms = new Float32Array(0)

  /**
   * @type {boolean}
   */
  #dirty = false

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

    const slot = {
      index: this.#nextBoneRow,
      boneCount
    }

    if (boneCount > 0) {
      this.#nextBoneRow += boneCount
      this.#ensureCapacity(this.#nextBoneRow)
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

    for (let i = 0; i < bones.length; i++) {
      const offset = (slot.index + i) * 16
      const bone = /** @type {import("../../../objects/index.js").Bone3D} */ (bones[i])
      const pose = /** @type {Affine3} */ (inverseBindPose[i] || new Affine3())
      const world = Affine3.multiply(
        bone.transform.world,
        pose
      )

      this.#boneTransforms[offset + 0] = world.a
      this.#boneTransforms[offset + 1] = world.b
      this.#boneTransforms[offset + 2] = world.c
      this.#boneTransforms[offset + 3] = 0
      this.#boneTransforms[offset + 4] = world.d
      this.#boneTransforms[offset + 5] = world.e
      this.#boneTransforms[offset + 6] = world.f
      this.#boneTransforms[offset + 7] = 0
      this.#boneTransforms[offset + 8] = world.g
      this.#boneTransforms[offset + 9] = world.h
      this.#boneTransforms[offset + 10] = world.i
      this.#boneTransforms[offset + 11] = 0
      this.#boneTransforms[offset + 12] = world.x
      this.#boneTransforms[offset + 13] = world.y
      this.#boneTransforms[offset + 14] = world.z
      this.#boneTransforms[offset + 15] = 1
    }

    this.#dirty = true
    return slot
  }

  /**
   * @param {import("../../../core/index.js").WebGLRenderDevice} device
   * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
   */
  upload(device, renderer) {
    if (!this.#dirty || this.texture.height === 0 || this.texture.depth === 0) {
      return
    }

    const gpuTexture = renderer.caches.getTexture(device, this.texture)

    device.writeTexture({
      texture: gpuTexture,
      data: /** @type {ArrayBuffer} */ (this.#boneTransforms.buffer),
      size: new Vector3(4, this.texture.height, this.texture.depth)
    })

    this.#dirty = false
  }

  /**
   * @param {number} rows
   */
  #ensureCapacity(rows) {
    if (rows <= 0) {
      return
    }

    const nextHeight = Math.min(rows, this.#maxHeight)
    const nextDepth = Math.ceil(rows / nextHeight)

    if (
      nextHeight <= this.texture.height &&
      nextDepth <= this.texture.depth
    ) {
      return
    }

    if (nextDepth > this.#maxLayers) {
      throw new Error("Bone texture array capacity exceeded")
    }

    const nextTransforms = new Float32Array(nextHeight * nextDepth * 16)

    nextTransforms.set(this.#boneTransforms)
    this.#boneTransforms = nextTransforms
    this.texture.height = nextHeight
    this.texture.depth = nextDepth
  }
}

/**
 * @typedef BoneTextureSlot
 * @property {number} index
 * @property {number} boneCount
 */
