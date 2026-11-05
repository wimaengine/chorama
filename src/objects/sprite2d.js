/** @import { Texture } from "../texture/index.js" */
/** @import { TextureAtlas } from "../texture/index.js" */
import { AlphaMaskMode, OpaqueMode, TransparentMode } from "../material/index.js"
import { Color, Vector2 } from "../math/index.js"
import { Object2D } from "./object2d.js"

/**
 * A textured 2D sprite rendered from a generated unit quad.
 */
export class Sprite2D extends Object2D {
  /**
   * The source image used by the sprite.
   * @type {Texture}
   */
  image

  /**
   * Normalized lower-left/upper-right texture regions.
   * @type {TextureAtlas | undefined}
   */
  atlas

  /**
   * Optional size override in image-space units. When undefined, the sprite
   * uses the dimensions of its selected image cutout.
   * @type {Vector2 | undefined}
   */
  size

  /**
   * Color multiplied with the sampled image.
   * @type {Color}
   */
  tint = new Color(1, 1, 1)

  /**
   * The selected atlas slice, or undefined for the full image.
   * @type {number | undefined}
   */
  slice

  /**
   * Alpha classification used by the sprite renderer.
   * @type {import("../material/index.js").AlphaBlend}
   */
  alphaBlend = new TransparentMode()

  /**
   * @param {Texture} image
   * @param {TextureAtlas} [atlas]
   */
  constructor(image, atlas) {
    super()
    this.image = image
    this.atlas = atlas
  }

  /**
   * Returns the selected normalized UV rectangle.
   *
   * @returns {[number, number, number, number]}
   */
  get uvRect() {
    if (this.atlas === undefined || this.slice === undefined) {
      return [0, 0, 1, 1]
    }

    const bounds = /** @type {TextureAtlas["slices"][number]} */ (this.atlas.slices[this.slice])

    return [bounds.min.x, bounds.min.y, bounds.max.x, bounds.max.y]
  }

  /**
   * Returns the sprite's alpha classification.
   *
   * @returns {import("../material/index.js").AlphaBlend}
   */
  alphaBlendMode() {
    return this.alphaBlend
  }

  /**
   * @override
   * @param {Map<import("./objectbase.js").ObjectBase, import("./objectbase.js").ObjectBase>} [entityMap]
   */
  clone(entityMap) {
    const sprite = /** @type {this} */ (new Sprite2D(this.image, this.atlas))
    sprite.copy(this, entityMap)
    return sprite
  }

  /**
   * @override
   * @param {this} object
   * @param {Map<import("./objectbase.js").ObjectBase, import("./objectbase.js").ObjectBase>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(object, entityMap)
    this.image = object.image
    this.atlas = object.atlas
    this.slice = object.slice
    this.size = object.size?.clone()
    this.tint.copy(object.tint)
    this.alphaBlend = cloneAlphaBlend(object.alphaBlend)
    return this
  }
}
/**
 * @param {import("../material/index.js").AlphaBlend} alphaBlend
 * @returns {import("../material/index.js").AlphaBlend}
 */
function cloneAlphaBlend(alphaBlend) {
  if (alphaBlend instanceof AlphaMaskMode) {
    return new AlphaMaskMode(alphaBlend.cutoff)
  }

  if (alphaBlend instanceof OpaqueMode) {
    return new OpaqueMode()
  }

  return new TransparentMode()
}
