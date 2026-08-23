/**
 * CPU-side uniform buffer payload.
 *
 * The cache owns the matching GPU allocation and can keep reusing it until
 * the payload grows beyond the current capacity.
 */
export class UniformBuffer {
  /**
   * Tracks whether the payload changed since the last cache lookup.
   * @type {boolean}
   */
  #changed = true

  /**
   * @type {ArrayBuffer}
   */
  #data

  /**
   * @param {ArrayBuffer} [data=new ArrayBuffer(0)]
   */
  constructor(data = new ArrayBuffer(0)) {
    this.#data = data
  }

  /**
   * @package
   * @returns {boolean}
   * This is an internal property, do not use!
   */
  get changed() {
    const previous = this.#changed
    this.#changed = false
    return previous
  }

  /**
   * @type {ArrayBuffer}
   */
  get data() {
    return this.#data
  }

  /**
   * @param {ArrayBuffer} value
   */
  set data(value) {
    this.#data = value
    this.#changed = true
  }

  /**
   * @type {number}
   */
  get size() {
    return this.#data.byteLength
  }
}
