/** @import { Camera } from "../../../objects/index.js" */
/** @import { Texture } from "../../../texture/index.js" */
/** @import { Texture2DPool } from "../RenderTarget2DPool.js" */

export class CameraColorTargets {
  /**
   * @type {Map<Camera, CameraColorTarget>}
   */
  targets = new Map()

  /**
   * @param {Camera} camera
   * @param {Texture | undefined} target
   */
  getOrSet(camera, target) {
    const existing = this.targets.get(camera)
    if (existing) {
      return existing
    }

    const cameraColorTarget = new CameraColorTarget(target)
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
   * @type {Texture | undefined}
   */
  target

  /**
   * @param {Texture | undefined} target
   */
  constructor(target) {
    this.target = target
  }

  /**
   * Replaces the tracked color target, recycling the previous temporary color.
   * @param {Texture2DPool} targetPool
   * @param {Texture | undefined} target
   */
  setColor(targetPool, target) {
    const previous = this.target
    this.target = target

    if (previous && previous !== target) {
      targetPool.recycle(previous)
    }
  }
}
