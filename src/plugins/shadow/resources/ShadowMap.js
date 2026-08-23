import { Object3D } from "../../../objects";
import { TextureType, TextureFormat, TextureWrap, TextureFilter } from "../../../constants";
import { Texture, Sampler } from "../../../texture";


export class ShadowMap {

  /**
   * @private
   */
  counter = 0;

  shadowAtlas = new Texture({
    type: TextureType.Texture2DArray,
    format: TextureFormat.Depth32Float
  });

  sampler = new Sampler({
    wrapR: TextureWrap.Clamp,
    wrapS: TextureWrap.Clamp,
    wrapT: TextureWrap.Clamp,
    minificationFilter: TextureFilter.Nearest,
    magnificationFilter: TextureFilter.Nearest,
    mipmapFilter: undefined
  });

  maxDepth = 10;

  /**
   * @param {number} maxShadows
   */
  constructor(maxShadows) {
    this.maxDepth = maxShadows;
    this.shadowAtlas.width = 2048
    this.shadowAtlas.height = 2048
    this.shadowAtlas.depth = maxShadows
  }

  /**
   * @type {Map<Object3D, ShadowArea>}
   */
  inner = new Map();

  reset() {
    this.counter = 0;
    this.inner.forEach((area) => {
      area.enabled = false;
    });
  }
  /**
   * @return {number}
   */
  getTarget() {
    const layer = this.counter;

    if (this.counter >= this.maxDepth) {
      console.error('Maximum shadows reached, some shadows will be ignored');
    }

    this.counter++;
    return layer;
  }
  /**
   * @param {Object3D} object
   */
  getOrSet(object) {
    const item = this.inner.get(object);

    if (item) {
      return item;
    }

    const newItem = new ShadowArea();

    this.inner.set(object, newItem);
    return newItem;
  }
}

export class ShadowArea {
  enabled = false;
  spaceIndex = -1;
}
