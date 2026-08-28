/** @import { Camera } from "../../../objects/index.js" */
import { Texture } from "../../../texture/index.js"

export class PrePassTextures {
  /**
   * @type {Map<Camera, PrePassTexture>}
   */
  targets = new Map()

  /**
   * @param {Camera} camera
   * @returns {PrePassTexture}
   */
  getOrSet(camera) {
    const existing = this.targets.get(camera)

    if (existing) {
      return existing
    }

    const prePassTexture = new PrePassTexture()
    this.targets.set(camera, prePassTexture)
    return prePassTexture
  }

  /**
   * @param {Camera} camera
   * @returns {PrePassTexture | undefined}
   */
  get(camera) {
    return this.targets.get(camera)
  }
}

export class PrePassTexture {
  /**
   * @type {Texture | undefined}
   */
  depth

  /**
   * @type {Texture | undefined}
   */
  normal
}
