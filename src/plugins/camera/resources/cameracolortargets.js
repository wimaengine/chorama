/** @import { Camera } from "../../../objects/index.js" */
/** @import { TextureSettings } from "../../../texture/index.js" */
import { TextureType } from "../../../constants/index.js"
import { Texture } from "../../../texture/index.js"

export class CameraColorTargets {
  /**
   * @type {Map<Camera, CameraColorTarget>}
   */
  targets = new Map()

  /**
   * Returns the tracked color pair for a camera, creating it if needed.
   * The textures are resized in place when the descriptor changes.
   *
   * @param {Camera} camera
   * @param {TextureSettings} descriptor
   * @returns {CameraColorTarget}
   */
  getOrSet(camera, descriptor) {
    const existing = this.targets.get(camera)

    if (existing) {
      existing.resize(descriptor)
      return existing
    }

    const cameraColorTarget = new CameraColorTarget(descriptor)
    this.targets.set(camera, cameraColorTarget)
    return cameraColorTarget
  }

  /**
   * @param {Camera} camera
   * @returns {CameraColorTarget | undefined}
   */
  get(camera) {
    return this.targets.get(camera)
  }
}

export class CameraColorTarget {
  /**
   * Current source texture for the camera chain.
   * @type {Texture}
   */
  readTarget

  /**
   * Alternate texture used as the next write destination.
   * @type {Texture}
   */
  writeTarget

  /**
   * @param {TextureSettings} descriptor
   */
  constructor(descriptor) {
    this.readTarget = createColorTexture(descriptor)
    this.writeTarget = createColorTexture(descriptor)
  }

  /**
   * Resizes both textures in place when the descriptor changes.
   * @param {TextureSettings} descriptor
   */
  resize(descriptor) {
    if (
      !textureMatchesDescriptor(this.readTarget, descriptor) ||
      !textureMatchesDescriptor(this.writeTarget, descriptor)
    ) {
      this.readTarget.apply(descriptor)
      this.writeTarget.apply(descriptor)
    }
  }

  /**
   * Returns the current input/output pair and advances the swap.
   * @returns {[Texture, Texture]}
   */
  getColorPair() {
    const input = this.readTarget
    const output = this.writeTarget

    this.readTarget = output
    this.writeTarget = input

    return [input, output]
  }
}

/**
 * @param {TextureSettings} descriptor
 * @returns {Texture}
 */
function createColorTexture(descriptor) {
  return new Texture({
    type: TextureType.Texture2D,
    format: descriptor.format,
    width: descriptor.width,
    height: descriptor.height,
    depth: descriptor.depth
  })
}

/**
 * @param {Texture} texture
 * @param {TextureSettings} descriptor
 * @returns {boolean}
 */
function textureMatchesDescriptor(texture, descriptor) {
  return (
    texture.format === descriptor.format &&
    texture.width === descriptor.width &&
    texture.height === descriptor.height &&
    texture.depth === descriptor.depth
  )
}
