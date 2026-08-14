/** @import { TextureSettings } from "../../texture/index.js" */
import { hash } from "hash-it";
import { TextureType } from "../../constants";
import { Texture } from "../../texture";
import { assertTrue } from "../../utils";


export class Texture2DPool {
  /**
   * @type {Map<number, [Required<TextureSettings>, Texture[]]>}
   */
  map = new Map();

  /**
   * @private
   * @param {number} id
   * @param {Required<TextureSettings>} descriptor
   */
  getInternal(id, descriptor) {
    const item = this.map.get(id);

    if (item) {
      return item;
    }
    const newItem = /**@type {[Required<TextureSettings>, Texture[]]} */ ([descriptor, []]);
    this.map.set(id, newItem);
    return newItem;
  }
  /**
   * @param {TextureSettings} descriptor
   * @returns {Texture}
   */
  get(descriptor) {
    const normalized = normalizeDescriptor(descriptor);
    const id = hash(normalized);
    const item = this.map.get(id);

    if (item && item[1].length) {
      return /**@type {Texture} */ (item[1].pop());
    }

    return new Texture({
      format: normalized.format,
      type: TextureType.Texture2D,
      width: normalized.width,
      height: normalized.height,
      depth: normalized.depth
    });
  }

  /**
   * @param {Texture} texture
   */
  recycle(texture) {
    const descriptor = descriptorFromTexture(texture);
    const id = hash(descriptor);

    const item = this.getInternal(id, descriptor);

    item[1].push(texture);
  }
}

export { Texture2DPool as RenderTarget2DPool }

/**
 * @param {TextureSettings} descriptor
 * @returns {Required<TextureSettings>}
 */
function normalizeDescriptor(descriptor) {
  return {
    format: descriptor.format ?? Texture.defaultSettings.format,
    width: descriptor.width ?? Texture.defaultSettings.width,
    height: descriptor.height ?? Texture.defaultSettings.height,
    depth: descriptor.depth ?? Texture.defaultSettings.depth
  }
}

/**
* @param {Texture} texture
* @returns {Required<TextureSettings>}
*/
export function descriptorFromTexture(texture) {
  assertTrue(texture.type === TextureType.Texture2D, "Invalid texture for the pool")

  const descriptor = {
    format: texture.format,
    width: texture.width,
    height: texture.height,
    depth: texture.depth
  }

  return descriptor
}
