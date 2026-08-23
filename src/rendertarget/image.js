import { Texture } from "../texture/index.js"
import { RenderTarget } from "./rendertarget.js";

export class ImageRenderTarget extends RenderTarget {
  /**
   * The single texture owned by this render target.
   * @type {Texture}
   */
  image

  /**
   * @type {number}
   */
  layer

  /**
   * @param {ImageRenderTargetOptions} options
   */
  constructor({
    image,
    width,
    height,
    depth = 1,
    layer = 0
  }) {
    super(width, height, depth)
    this.layer = layer
    this.image = image
    this.image.data = []
    this.image.width = width
    this.image.height = height
    this.image.depth = depth
  }

  /**
   * Backwards-compatible color attachment list for call sites that still
   * expect a render target with one color texture.
   * @returns {Texture[]}
   */
  get color() {
    return [this.image]
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
    this.image.width = value
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
    this.image.height = value
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
    this.image.depth = value
  }
}

/**
 * @typedef ImageRenderTargetOptions
 * @property {Texture} image
 * @property {number} width
 * @property {number} height
 * @property {number} [depth]
 * @property {number} [layer]
 */
