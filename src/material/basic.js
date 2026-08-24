import { Material } from "./material.js"
import { AlphaMaskMode, OpaqueMode } from "./alphablend.js"
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
   * @param {DataView} data
   */
  getData(data) {
    const { color } = this
    const alphaCutoff = this.alphaBlend instanceof AlphaMaskMode ? this.alphaBlend.cutoff : 0.5
    const floats = new Float32Array(data.buffer, data.byteOffset, 5)

    floats[0] = color.r
    floats[1] = color.g
    floats[2] = color.b
    floats[3] = color.a
    floats[4] = alphaCutoff
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
