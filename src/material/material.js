/**@import { WebGLRenderPipelineDescriptor } from '../core/webgl/descriptors.js' */

import {
  CullFace,
  FrontFaceDirection
} from "../constants/index.js"
import { abstractClass, abstractMethod } from "../utils/index.js"
import { AlphaMaskMode } from "./alphablend.js"
import { RawMaterial } from "./raw.js"

/**
 * @abstract
 */
export class Material extends RawMaterial {
  /**
   * @type {FrontFaceDirection}
   */
  frontFace = FrontFaceDirection.CCW
  /**
   * @type {CullFace}
   */
  cullFace = CullFace.Back

  /**
   * @type {boolean}
   */
  depthWrite = true

  /**
   * Returns the material's alpha classification.
   * @override
   * @returns {import("./alphablend.js").AlphaBlend}
   */
  alphaBlendMode() {
    abstractMethod(this, Material, "alphaBlendMode")
  }

  constructor(){
    super()
    abstractClass(this, Material)
  }
  /**
   * @override
   * @returns {string}
   */
  vertex() {
    abstractMethod(this, Material, Material.prototype.vertex.name)
  }

  /**
   * @override
   * @returns {string}
   */
  fragment() {
    abstractMethod(this, Material, Material.prototype.fragment.name)
  }

  /**
   * @override
   * @returns {ArrayBuffer}
   */
  getData() {
    if (this.constructor === RawMaterial) {
      throw `\`${RawMaterial.name}\` cannot be used directly as a material.`
    }
    throw `Implement \`${this.constructor.name}.uploadUniforms()\``
  }

  /**
   * @override
   * @returns {bigint}
   */
  getPipelineBits() {
    let materialKey = MaterialKey.None
    if (this.cullFace === CullFace.Front) {
      materialKey |= MaterialKey.CullFaceFront
    } else if (this.cullFace === CullFace.Back) {
      materialKey |= MaterialKey.CullFaceBack
    } else if (this.cullFace === CullFace.FrontAndBack) {
      materialKey |= MaterialKey.CullFaceBoth
    }
    if (this.depthWrite) {
      materialKey |= MaterialKey.DepthWrite
    }
    if (this.frontFace == FrontFaceDirection.CW) {
      materialKey |= MaterialKey.FrontFaceCW
    }
    if (this.alphaBlendMode() instanceof AlphaMaskMode) {
      materialKey |= MaterialKey.AlphaMaskEnabled
    }

    return materialKey
  }

  /**
   * @override
   * @param {WebGLRenderPipelineDescriptor} descriptor
   */
  specialize(descriptor) {
    descriptor.cullFace = this.cullFace
    descriptor.frontFace = this.frontFace
    descriptor.depthWrite = this.depthWrite
    if (this.alphaBlendMode() instanceof AlphaMaskMode) {
      descriptor.fragment?.source?.defines.set("ALPHA_MASK_MODE", "")
    } else {
      descriptor.fragment?.source?.defines.delete("ALPHA_MASK_MODE")
    }
  }
}

/**
 * @enum {bigint}
 */
export const MaterialKey = /**@type {const}*/({
  None: 0n,
  CullFaceNone: 0n << 0n,
  CullFaceFront: 1n << 0n,
  CullFaceBack: 2n << 0n,
  CullFaceBoth: 3n << 0n,
  FrontFaceCW: 1n << 2n,
  DepthWrite: 1n << 3n,
  AlphaMaskEnabled: 1n << 4n
})
