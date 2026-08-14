import { TextureFilter } from "../../../constants/index.js"
import { Sampler, Texture } from "../../../texture/index.js"

export class EnvironmentMap {
  /**
   * @type {Texture | undefined}
   */
  texture

  /**
   * @type {Sampler}
   */
  sampler

  /**
   * @param {EnvironmentMapSettings} [settings]
   */
  constructor({
    texture = undefined,
    sampler = new Sampler({
      mipmapFilter: TextureFilter.Linear
    })
  } = {}) {
    this.texture = texture
    this.sampler = sampler
  }

  /**
   * Replaces the active environment map.
   * @param {Texture} texture
   * @param {Sampler} [sampler]
   */
  set(texture, sampler = this.sampler) {
    this.texture = texture
    this.sampler = sampler
    return this
  }
}

/**
 * @typedef EnvironmentMapSettings
 * @property {Texture} [texture]
 * @property {Sampler} [sampler]
 */
