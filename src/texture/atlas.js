/** @import { BoundingBox2D } from "maumbo" */

/**
 * Texture regions expressed as normalized coordinates over a complete image.
 */
export class TextureAtlas {
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
   * @returns {TextureAtlas}
   */
  clone() {
    return new TextureAtlas(this.slices.map((bounds) => bounds.clone()))
  }
}
