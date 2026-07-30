/**@import { WebGLRenderPipelineDescriptor } from '../core/webgl/descriptors.js' */

import {
  CullFace,
  FrontFaceDirection
} from "../constants/index.js"
import { abstractClass, abstractMethod } from "../utils/index.js"
import { AlphaMaskMode, TransparentMode } from "./alphablend.js"
import { RawMaterial } from "./raw.js"
import { BlendParams } from "../core/index.js"

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
    const alphaBlendMode = this.alphaBlendMode()
    const isTransparent = alphaBlendMode instanceof TransparentMode

    if (this.cullFace === CullFace.Front) {
      materialKey |= MaterialKey.CullFaceFront
    } else if (this.cullFace === CullFace.Back) {
      materialKey |= MaterialKey.CullFaceBack
    } else if (this.cullFace === CullFace.FrontAndBack) {
      materialKey |= MaterialKey.CullFaceBoth
    }
    if (this.depthWrite && !isTransparent) {
      materialKey |= MaterialKey.DepthWrite
    }
    if (this.frontFace == FrontFaceDirection.CW) {
      materialKey |= MaterialKey.FrontFaceCW
    }
    if (alphaBlendMode instanceof AlphaMaskMode) {
      materialKey |= MaterialKey.AlphaBlendMask
    } else if (isTransparent) {
      materialKey |= MaterialKey.AlphaBlendTransparent
    } else {
      materialKey |= MaterialKey.AlphaBlendOpaque
    }

    return materialKey
  }

  /**
   * @override
   * @param {WebGLRenderPipelineDescriptor} descriptor
   */
  specialize(descriptor) {
    const alphaBlendMode = this.alphaBlendMode()
    const isTransparent = alphaBlendMode instanceof TransparentMode

    descriptor.cullFace = this.cullFace
    descriptor.frontFace = this.frontFace
    descriptor.depthWrite = isTransparent ? false : this.depthWrite

    const target = descriptor.fragment?.targets?.[0]

    if (target) {
      if (isTransparent) {
        target.blend = {
          color: BlendParams.AlphaBlend,
          alpha: BlendParams.AlphaBlend
        }
      } else {
        target.blend = undefined
      }
    }

    if (alphaBlendMode instanceof AlphaMaskMode) {
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
  AlphaBlendOpaque: 0n << 4n,
  AlphaBlendMask: 1n << 4n,
  AlphaBlendTransparent: 2n << 4n
})
