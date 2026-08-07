/** @import { Camera } from "../../../objects/index.js" */
/** @import { TextureSettings } from "../../../texture/index.js" */
/** @import { Texture2DPool } from "../RenderTarget2DPool.js" */
import { Texture } from "../../../texture/index.js"

export class CameraColorTargets {
  /**
   * @type {Map<Camera, CameraColorTarget>}
   */
  targets = new Map()

  /**
   * @param {Camera} camera
   * @param {Texture2DPool} targetPool
   * @param {TextureSettings} descriptor
   */
  getOrSet(camera, targetPool, descriptor) {
    const existing = this.targets.get(camera)

    if (existing) {
      existing.target.width = descriptor.width || existing.target.width
      existing.target.height = descriptor.height || existing.target.height
      return existing
    }

    const cameraColorTarget = new CameraColorTarget(targetPool.get(descriptor))
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
   * @type {Texture}
   */
  target

  /**
   * @param {Texture} target
   */
  constructor(target) {
    this.target = target
  }

  /**
   * Replaces the tracked color target, recycling the previous temporary color.
   * @param {Texture2DPool} targetPool
   * @param {Texture} target
   */
  setColor(targetPool, target) {
    const previous = this.target
    this.target = target

    if (previous && previous !== target) {
      targetPool.recycle(previous)
    }
  }
}
