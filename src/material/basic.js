import { Material } from "./material.js"
import { OpaqueMode } from "./alphablend.js"
import { Color } from "../math/index.js"
import { basicVertex, basicFragment } from "../shader/index.js"
import { Texture } from "../texture/index.js"
import { Sampler } from "../texture/sampler.js"

export class BasicMaterial extends Material {

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
   * @param {BasicMaterialOptions} param0 
   */
  constructor({
    color = new Color(1, 1, 1),
    mainTexture = undefined,
    mainSampler = undefined
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
    return basicFragment
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
   * @override
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures() {
    return [['mainTexture', 0, this.mainTexture, this.mainSampler]]
  }
}

/**
 * @typedef BasicMaterialOptions
 * @property {Color} [color]
 * @property {Texture | undefined} [mainTexture]
 * @property {Sampler | undefined} [mainSampler]
 */
