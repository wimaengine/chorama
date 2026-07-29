import { Material } from "./material.js"
import { OpaqueMode } from "./alphablend.js"
import { Color } from "../math/index.js"
import { basicVertex, lambertFragment } from "../shader/index.js"
import { Texture, Sampler } from "../texture/index.js"

export class LambertMaterial extends Material {
  /**
   * @type {Color}
   */
  color

  /**
   * @type {Texture | undefined}
   */
  mainTexture

  /**
   * @type {Sampler | undefined}
   */
  mainSampler

  /**
   * @type {import("./alphablend.js").AlphaBlend}
   */
  alphaBlend = new OpaqueMode()

  /**
   * @param {LambertMaterialOptions} param0 
   */
  constructor({
    mainTexture = undefined,
    mainSampler = undefined,
    color = new Color(1, 1, 1)
  } = {}) {
    super()
    this.color = color
    this.mainTexture = mainTexture
    this.mainSampler = mainSampler
  }

  /**
   * @override
   */
  vertex() {
    return basicVertex
  }

  /**
   * @override
   */
  fragment() {
    return lambertFragment
  }

  /**
   * @override
   * @returns {import("./alphablend.js").AlphaBlend}
   */
  alphaBlendMode() {
    return this.alphaBlend
  }

  /**
   * @override
   */
  getData() {
    const { color } = this
    
    return new Float32Array([...color]).buffer
  }

  /**
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   * @override
   */
  getTextures() {
    return [['mainTexture', 0, this.mainTexture, this.mainSampler]]
  }
}

/**
 * @typedef LambertMaterialOptions
 * @property {Color} [color]
 * @property {Texture} [mainTexture]
 * @property {Sampler} [mainSampler]
 */
