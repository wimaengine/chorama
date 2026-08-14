import { TextureFilter, TextureWrap } from '../constants/index.js'
import { CompareFunction } from '../core/index.js'
export class Sampler {
  /**
   * Tracks if the sampler has changed since last checked.
   * @type {boolean}
   */
  #changed = false

  /**
   * @type {TextureFilter}
   */
  #magnificationFilter
  /**
   * @type {TextureFilter}
   */
  #minificationFilter
  /**
   * @type {TextureFilter | undefined}
   */
  #mipmapFilter
  
  /**
   * @type {TextureWrap}
   */
  #wrapS
  /**
   * @type {TextureWrap}
   */
  #wrapT
  /**
   * @type {TextureWrap}
   */
  #wrapR
  /**
   * @type {number}
   */
  #anisotropy
  /**
   * @type {SamplerLODSettings | undefined}
   */
  #lod
  /**
   * @type {CompareFunction | undefined}
   */
  #compare
  /**
   * @param {SamplerSettings} settings 
   */
  constructor({
    magnificationFilter = Sampler.defaultSettings.magnificationFilter,
    minificationFilter = Sampler.defaultSettings.minificationFilter,
    mipmapFilter = Sampler.defaultSettings.mipmapFilter,
    wrapS = Sampler.defaultSettings.wrapS,
    wrapT = Sampler.defaultSettings.wrapT,
    wrapR = Sampler.defaultSettings.wrapR,
    lod = Sampler.defaultSettings.lod,
    anisotropy = Sampler.defaultSettings.anisotropy,
    compare = Sampler.defaultSettings.compare
  } = Sampler.defaultSettings) {
    this.#minificationFilter = minificationFilter
    this.#magnificationFilter = magnificationFilter
    this.#mipmapFilter = mipmapFilter
    this.#wrapS = wrapS
    this.#wrapT = wrapT
    this.#wrapR = wrapR
    this.#anisotropy = anisotropy
    this.#lod = lod
    this.#compare = compare
  }

  /**
   * @package
   * @returns {boolean}
   */
  get changed() {
    const previous = this.#changed
    this.#changed = false
    return previous
  }

  /** @type {TextureFilter} */
  get magnificationFilter() { return this.#magnificationFilter }
  set magnificationFilter(value) {
    this.#magnificationFilter = value
    this.#changed = true
  }

  /** @type {TextureFilter} */
  get minificationFilter() { return this.#minificationFilter }
  set minificationFilter(value) {
    this.#minificationFilter = value
    this.#changed = true
  }

  /** @type {TextureFilter | undefined} */
  get mipmapFilter() { return this.#mipmapFilter }
  set mipmapFilter(value) {
    this.#mipmapFilter = value
    this.#changed = true
  }

  /** @type {TextureWrap} */
  get wrapS() { return this.#wrapS }
  set wrapS(value) {
    this.#wrapS = value
    this.#changed = true
  }

  /** @type {TextureWrap} */
  get wrapT() { return this.#wrapT }
  set wrapT(value) {
    this.#wrapT = value
    this.#changed = true
  }

  /** @type {TextureWrap} */
  get wrapR() { return this.#wrapR }
  set wrapR(value) {
    this.#wrapR = value
    this.#changed = true
  }

  /** @type {number} */
  get anisotropy() { return this.#anisotropy }
  set anisotropy(value) {
    this.#anisotropy = value
    this.#changed = true
  }

  /** @type {Readonly<SamplerLODSettings> | undefined} */
  get lod() {
    return this.#lod
  }
  set lod(value) {
    this.#lod = value
    this.#changed = true
  }

  /** @type {CompareFunction | undefined} */
  get compare() { return this.#compare }
  set compare(value) {
    this.#compare = value
    this.#changed = true
  }

  static default(){
    return new Sampler()
  }

  /**
   * @readonly
   * @type {Readonly<
   *   Required<Omit<SamplerSettings,'compare' | 'mipmapFilter'>>
   *   > & {
   *    compare: CompareFunction | undefined;
   *    mipmapFilter: TextureFilter | undefined;
   *   }
   * }
   */
  static defaultSettings = {
    magnificationFilter: TextureFilter.Linear,
    minificationFilter: TextureFilter.Linear,
    mipmapFilter: undefined,
    wrapS: TextureWrap.Clamp,
    wrapT: TextureWrap.Clamp,
    wrapR: TextureWrap.Clamp,
    lod: { min: 0, max: 12 },
    anisotropy: 1,
    compare: undefined
  }
}

/**
 * @typedef SamplerSettings
 * @property {TextureFilter} [minificationFilter]
 * @property {TextureFilter} [magnificationFilter]
 * @property {TextureFilter} [mipmapFilter]
 * @property {TextureWrap} [wrapS]
 * @property {TextureWrap} [wrapT]
 * @property {TextureWrap} [wrapR]
 * @property {SamplerLODSettings} [lod]
 * @property {number} [anisotropy]
 * @property {CompareFunction} [compare]
 */

/**
 * @typedef SamplerLODSettings
 * @property {number} max
 * @property {number} min
 */
