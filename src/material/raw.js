import { CullFace, FrontFaceDirection } from "../constants/others.js"
import { Sampler, Texture } from "../texture/index.js"
import { abstractClass, abstractMethod } from "../utils/index.js"

/**
 * @abstract
 */
export class RawMaterial {

  constructor(){
    abstractClass(this, RawMaterial)
  }
  /**
   * @returns {string}
   */
  vertex() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.vertex.name)
  }

  /**
   * @returns {string}
   */
  fragment() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.fragment.name)
  }

  /**
   * @returns {import("./alphablend.js").AlphaBlend}
   */
  alphaBlendMode() {
    abstractMethod(this, RawMaterial, "alphaBlendMode")
  }

  /**
   * @returns {ArrayBuffer}
   */
  getData() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.getData.name)
  }

  /**
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures(){
    return []
  }

  /**
   * @returns {bigint}
   */
  getPipelineBits() {
    return 0n
  }

  /**
   * @param {MaterialSpecializeDescriptor} _descriptor
   */
  specialize(_descriptor) { }
}

/**
 * Descriptor passed to `specialize()` before shaders are compiled.
 * @typedef MaterialSpecializeDescriptor
 * @property {CullFace} [cullFace]
 * @property {FrontFaceDirection} [frontFace]
 * @property {boolean} [depthWrite]
 * @property {{
 *   source?: import("../core/shader.js").Shader,
 *   targets?: Array<{ blend?: unknown }>
 * }} [fragment]
 */