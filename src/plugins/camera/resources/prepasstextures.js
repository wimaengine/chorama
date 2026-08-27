/** @import { Camera } from "../../../objects/index.js" */
/** @import { TextureSettings } from "../../../texture/index.js" */
/** @import { Texture2DPool } from "../RenderTarget2DPool.js" */
import { Texture } from "../../../texture/index.js"

export class PrePassTextures {
  /**
   * @type {Map<Camera, PrePassTexture>}
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
      const depth = existing.depth
      const width = descriptor.width ?? depth.width
      const height = descriptor.height ?? depth.height
      const layerCount = descriptor.depth ?? depth.depth
      const format = descriptor.format ?? depth.format

      if (
        depth.width === width &&
        depth.height === height &&
        depth.depth === layerCount &&
        depth.format === format
      ) {
        return existing
      }

      existing.setDepth(targetPool, targetPool.get({
        width,
        height,
        depth: layerCount,
        format
      }))
      return existing
    }

    const prePassTexture = new PrePassTexture(targetPool.get(descriptor))
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
   * @type {Texture}
   */
  depth

  /**
   * @param {Texture} depth
   */
  constructor(depth) {
    this.depth = depth
  }

  /**
   * Replaces the tracked depth target, recycling the previous temporary depth.
   * @param {Texture2DPool} targetPool
   * @param {Texture} depth
   */
  setDepth(targetPool, depth) {
    const previous = this.depth
    this.depth = depth

    if (previous && previous !== depth) {
      targetPool.recycle(previous)
    }
  }
}
