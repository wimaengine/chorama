/**
 * @abstract
 */
export class RenderTarget {
  /**
   * @protected
   * @type {boolean}
   */
  _change = false
  /**
   * @type {number}
   */
  #width = 0
  /**
  * @type {number}
  */
  #height = 0
  /**
  * @type {number}
  */
  #depth = 0

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} depth
   */
  constructor(width, height, depth) {
    this.#width = width
    this.#height = height
    this.#depth = depth
  }
  get width() {
    return this.#width
  }
  set width(value) {
    this.#width = value
    this._change = true
  }
  get height() {
    return this.#height
  }
  set height(value) {
    this.#height = value
    this._change = true
  }

  get depth() {
    return this.#depth
  }
  set depth(value) {
    this.#depth = value
    this._change = true
  }

  changed() {
    const prev = this._change
    this._change = false

    return prev
  }
}
