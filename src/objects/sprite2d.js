/** @import { TextureAtlas } from "../texture/index.js" */
import { AlphaMaskMode, OpaqueMode, TransparentMode } from "../material/index.js"
import { Color, Vector2 } from "../math/index.js"
import { Object2D } from "./object2d.js"

/**
 * A textured 2D sprite rendered from a generated unit quad.
 */
export class Sprite2D extends Object2D {
  /**
   * The textures and layouts available to the sprite.
   * @type {TextureAtlas[]}
   */
  atlases = []

  /**
   * The index of the selected texture atlas.
   * @type {number}
   */
  atlasIndex = 0

  /**
   * The index of the selected slice in the current atlas layout. An invalid
   * index selects the complete texture.
   * @type {number}
   */
  sliceIndex = 0

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
   * Alpha classification used by the sprite renderer.
   * @type {import("../material/index.js").AlphaBlend}
   */
  alphaBlend = new TransparentMode()

  /**
   * @param {TextureAtlas[]} atlases
   */
  constructor(atlases) {
    super()
    this.atlases = atlases
  }

  /**
   * @override
   * @param {Map<import("./objectbase.js").ObjectBase, import("./objectbase.js").ObjectBase>} [entityMap]
   */
  clone(entityMap) {
    const sprite = /** @type {this} */ (new Sprite2D(this.atlases))
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
    this.atlases = object.atlases.slice()
    this.atlasIndex = object.atlasIndex
    this.sliceIndex = object.sliceIndex
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
