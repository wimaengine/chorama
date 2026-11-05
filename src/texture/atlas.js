/** @import { BoundingBox2D } from "maumbo" */
/** @import { Texture } from "./texture.js" */

/**
 * Texture regions expressed as normalized coordinates over a complete image.
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
