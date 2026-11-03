import { CullFace, FrontFaceDirection } from "../constants/others.js"
import { basicVertex } from "../shader/index.js"
import { Sampler, Texture } from "../texture/index.js"
import { abstractClass, abstractMethod } from "../utils/index.js"

/**
 * @abstract
 */
export class RawMaterial {

  constructor() {
    abstractClass(this, RawMaterial)
  }

  /**
   * Returns the material's primary color texture, when one exists.
   *
   * @returns {import("../texture/index.js").Texture | undefined}
   */
  getmainTexture() {
    return undefined
  }
  /**
   * @returns {string}
   */
  vertex() {
    return basicVertex
  }

  /**
   * @returns {string}
   */
  fragment() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.fragment)
  }

  /**
   * Returns the vertex shader used by the camera prepass.
   *
   * @returns {string}
   */
  prepassVertex() {
    return this.vertex()
  }

  /**
   * Returns the fragment shader used by the camera prepass.
   *
   * @returns {string}
   */
  prepassFragment() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.prepassFragment)
  }

  /**
   * @returns {import("./alphablend.js").AlphaBlend}
   */
  alphaBlendMode() {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.alphaBlendMode)
  }

  /**
   * @param {DataView} _data
   */
  getData(_data) {
    abstractMethod(this, RawMaterial, RawMaterial.prototype.getData)
  }

  /**
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures() {
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
 *   targets?: Array<{ format?: import("../constants/index.js").TextureFormat, blend?: unknown }>
 * }} [fragment]
 */
