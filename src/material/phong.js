import { Material } from "./material.js"
import { AlphaMaskMode, OpaqueMode } from "./alphablend.js"
import { Color } from "../math/index.js"
import { basicVertex, phongFragment } from "../shader/index.js"
import { Sampler, Texture } from "../texture/index.js"

export class PhongMaterial extends Material {
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
   * @param {PhongMaterialOptions} param0 
   */
  constructor({
    color = new Color(1, 1, 1),
    mainTexture = undefined,
    mainSampler = undefined,
    specularStrength = 0.5,
    specularShininess = 32,
  } = {}) {
    super()
    this.color = color
    this.mainTexture = mainTexture
    this.mainSampler = mainSampler
    this.specularStrength = specularStrength
    this.specularShininess = specularShininess
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
    return phongFragment
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
   * @param {DataView} data
   */
  getData(data) {
    const {
      color,
      specularShininess,
      specularStrength
    } = this
    const alphaCutoff = this.alphaBlend instanceof AlphaMaskMode ? this.alphaBlend.cutoff : 0.5
    const floats = new Float32Array(data.buffer, data.byteOffset, 7)

    floats[0] = color.r
    floats[1] = color.g
    floats[2] = color.b
    floats[3] = color.a
    floats[4] = specularShininess
    floats[5] = specularStrength
    floats[6] = alphaCutoff
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
 * @typedef PhongMaterialOptions
 * @property {Color} [color]
 * @property {Texture} [mainTexture]
 * @property {Sampler} [mainSampler]
 * @property {number} [specularShininess]
 * @property {number} [specularStrength]
 */
