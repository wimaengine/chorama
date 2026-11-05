/** @import { BoundingBox2D } from "maumbo" */
/** @import { Texture } from "./texture.js" */

/**
 * Texture regions expressed as normalized top-left coordinates over a
 * complete image. The y-axis increases downward: [0, 0] is the top-left
 * corner and [1, 1] is the bottom-right corner.
 */
export class TextureAtlasLayout {
  /**
   * @type {BoundingBox2D[]}
   */
  slices = []

  /**
   * @param {BoundingBox2D[]} [slices=[]]
   */
  constructor(slices = []) {
    this.slices = slices
  }

  /**
   * @returns {TextureAtlasLayout}
   */
  clone() {
    return new TextureAtlasLayout(this.slices.map((bounds) => bounds.clone()))
  }
}

/**
 * A texture together with the layout used to select regions from it.
 */
export class TextureAtlas {
  /**
   * @type {Texture}
   */
  texture

  /**
   * @type {TextureAtlasLayout | undefined}
   */
  layout

  /**
   * @param {Texture} texture
   * @param {TextureAtlasLayout} [layout]
   */
  constructor(texture, layout) {
    this.texture = texture
    this.layout = layout
  }

  /**
   * @returns {TextureAtlas}
   */
  clone() {
    return new TextureAtlas(this.texture, this.layout?.clone())
  }
}
