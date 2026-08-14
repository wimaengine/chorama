import { TextureFormat } from "../constants/index.js";
import { Texture } from "../texture/index.js"
import { RenderTarget } from "./rendertarget.js";

export class ImageRenderTarget extends RenderTarget {
  /**
   * @type {Texture[]}
   */
  color

  /**
   * @type {Texture | undefined}
   */
  depthTexture

  /**
   * @type {TextureFormat | undefined}
   */
  internalDepthStencil

  /**
   * @type {number}
   */
  layer

  /**
   * @param {ImageRenderTargetOptions} options
   */
  constructor({
    color = [],
    depthTexture,
    width,
    height,
    depth = 1,
    layer = 0,
    internalDepthStencil
  }) {
    super(width, height, depth)
    this.layer = layer
    this.color = color
    this.depthTexture = depthTexture
    this.internalDepthStencil = internalDepthStencil

    for (const color of this.color) {
      color.data = []
      color.width = width
      color.height = height
      color.depth = depth
    }

    if (this.depthTexture) {
      this.depthTexture.data = []
      this.depthTexture.width = width
      this.depthTexture.height = height
      this.depthTexture.depth = depth
    }
  }

  /**
   * @override
   */
  get width() {
    return super.width
  }

  /**
   * @override
   * @param {number} value
   */
  set width(value) {
    super.width = value
    this.color.forEach((attachment) => {
      attachment.width = value
    })
    if (this.depthTexture) {
      this.depthTexture.width = value
    }
  }

  /**
   * @override
   */
  get height() {
    return super.height
  }

  /**
   * @override
   * @param {number} value
   */
  set height(value) {
    super.height = value
    this.color.forEach((attachment) => {
      attachment.height = value
    })
    if (this.depthTexture) {
      this.depthTexture.height = value
    }
  }

  /**
   * @override
   */
  get depth() {
    return super.depth
  }

  /**
   * @override
   * @param {number} value
   */
  set depth(value) {
    super.depth = value
    this.color.forEach((attachment) => {
      attachment.depth = value
    })
    if (this.depthTexture) {
      this.depthTexture.depth = value
    }
  }
}

/**
 * @typedef ImageRenderTargetOptions
 * @property {Texture[]} [color]
 * @property {Texture} [depthTexture]
 * @property {TextureFormat} [internalDepthStencil]
 * @property {number} width
 * @property {number} height
 * @property {number} [depth]
 * @property {number} [layer]
 */
