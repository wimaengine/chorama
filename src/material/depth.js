import { Material } from "./material.js"
import { OpaqueMode } from "./alphablend.js"
import { basicVertex, depthFragment } from "../shader/index.js"
import { Texture } from "../texture/index.js"
import { Sampler } from "../texture/sampler.js"
import { TextureFilter } from "../constants/texture.js"

// This should be a post processing effect as it renders the entire scene.
export class DepthMaterial extends Material {

  /**
   * @type {Texture | undefined}
   */
  depth

  near = 0.1

  far = 1000
  /**
   * @type {Sampler | undefined}
   */
  mainSampler

  /**
   * @type {import("./alphablend.js").AlphaBlend}
   */
  alphaBlend = new OpaqueMode()

  /**
   * @param {DepthMaterialOptions} options 
   */
  constructor({
    depth
  }) {
    super()
    this.depth = depth
    this.mainSampler = new Sampler({
      minificationFilter: TextureFilter.Nearest,
      magnificationFilter: TextureFilter.Nearest
    })
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
    return depthFragment
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
    const floats = new Float32Array(data.buffer, data.byteOffset, 2)

    floats[0] = this.near
    floats[1] = this.far
  }

  /**
   * @override
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures() {
    return [['depth_texture', 0, this.depth, this.mainSampler]]
  }
}

/**
 * @typedef DepthMaterialOptions
 * @property {Texture} depth
 */
