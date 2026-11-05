import { lerp } from "../math/index.js"

/**
 * Animation interpolation modes.
 * @enum {number}
 */
export const AnimationMode = /** @type {const} */ ({
  Linear: 0,
  Step: 1,
  Cubic: 2
})

export class AnimationTrack {
  /**
   * @type {number}
   */
  size = 0

  /**
   * @type {AnimationMode}
   */
  mode = AnimationMode.Linear

  /**
   * @type {number[]}
   */
  inTangents = []

  /**
   * @type {number[]}
   */
  outTangents = []

  /**
   * @type {number[]}
   */
  times = []

  /**
   * @type {number[]}
   */
  keyframes = []

  /**
   * @param {number} [size=0]
   */
  constructor(size = 0) {
    this.size = size
  }

  /**
   * @returns {number}
   */
  elementSize() {
    return this.size
  }

  /**
   * @param {AnimationTrack} track
   * @returns {this}
   */
  copy(track) {
    this.size = track.size
    this.mode = track.mode
    this.times = track.times.slice()
    this.keyframes = track.keyframes.slice()
    this.inTangents = track.inTangents.slice()
    this.outTangents = track.outTangents.slice()

    return this
  }

  /**
   * @returns {AnimationTrack}
   */
  clone() {
    const Constructor = /** @type {new () => AnimationTrack} */ (this.constructor)
    return new Constructor().copy(this)
  }

  /**
   * @returns {boolean}
   */
  validate() {
    const size = this.elementSize()

    if (!Number.isInteger(size) || size < 0) {
      return false
    }

    if (this.times.length === 0) {
      return this.keyframes.length === 0
    }

    for (let i = 1; i < this.times.length; i++) {
      const previous = /** @type {number} */ (this.times[i - 1])
      const current = /** @type {number} */ (this.times[i])

      if (previous > current) {
        return false
      }
    }

    const expectedLength = this.times.length * size
    if (this.keyframes.length !== expectedLength) {
      return false
    }

    if (this.mode === AnimationMode.Cubic) {
      return (
        this.times.length >= 2 &&
        this.inTangents.length === expectedLength &&
        this.outTangents.length === expectedLength
      )
    }

    return true
  }

  /**
   * @param {number} delta
   * @returns {number[] | undefined}
   */
  getCurrent(delta) {
    const size = this.elementSize()

    if (size <= 0 || this.times.length === 0 || this.keyframes.length === 0) {
      return undefined
    }

    const firstTime = /** @type {number} */ (this.times[0])

    if (delta <= firstTime) {
      return this.readFrame(0)
    }

    const lastIndex = this.times.length - 1
    const lastTime = /** @type {number} */ (this.times[lastIndex])

    if (delta >= lastTime) {
      return this.readFrame(lastIndex)
    }

    let upperIndex = 1
    while (upperIndex < this.times.length) {
      const upperTime = /** @type {number} */ (this.times[upperIndex])

      if (upperTime >= delta) {
        break
      }

      upperIndex++
    }

    const lowerIndex = upperIndex - 1
    const start = /** @type {number} */ (this.times[lowerIndex])
    const end = /** @type {number} */ (this.times[upperIndex])

    const t = end === start ? 0 : (delta - start) / (end - start)

    return this.interpolateFrame(lowerIndex, upperIndex, t)
  }

  /**
   * @param {number} index
   * @returns {number[]}
   */
  readFrame(index) {
    const size = this.elementSize()
    const offset = index * size

    return this.keyframes.slice(offset, offset + size)
  }

  /**
   * @param {number} indexA
   * @param {number} indexB
   * @param {number} t
   * @returns {number[]}
   */
  interpolateFrame(indexA, indexB, t) {
    switch (this.mode) {
      case AnimationMode.Step:
        return this.readFrame(indexA)
      case AnimationMode.Cubic:
        return this.interpolateCubicFrame(indexA, indexB, t)
      case AnimationMode.Linear:
      default:
        return this.interpolateLinearFrame(indexA, indexB, t)
    }
  }

  /**
   * @param {number} indexA
   * @param {number} indexB
   * @param {number} t
   * @returns {number[]}
   */
  interpolateLinearFrame(indexA, indexB, t) {
    const size = this.elementSize()
    const values = new Array(size)
    const offsetA = indexA * size
    const offsetB = indexB * size

    for (let i = 0; i < size; i++) {
      const start = /** @type {number} */ (this.keyframes[offsetA + i])
      const end = /** @type {number} */ (this.keyframes[offsetB + i])

      values[i] = lerp(start, end, t)
    }

    return values
  }

  /**
   * @param {number} indexA
   * @param {number} indexB
   * @param {number} t
   * @returns {number[]}
   */
  interpolateCubicFrame(indexA, indexB, t) {
    const size = this.elementSize()
    const values = new Array(size)
    const offsetA = indexA * size
    const offsetB = indexB * size
    const duration = /** @type {number} */ (this.times[indexB]) - /** @type {number} */ (this.times[indexA])
    const t2 = t * t
    const t3 = t2 * t

    for (let i = 0; i < size; i++) {
      const start = /** @type {number} */ (this.keyframes[offsetA + i])
      const end = /** @type {number} */ (this.keyframes[offsetB + i])
      const outTangent = /** @type {number} */ (this.outTangents[offsetA + i])
      const inTangent = /** @type {number} */ (this.inTangents[offsetB + i])

      values[i] =
        (2 * t3 - 3 * t2 + 1) * start +
        duration * (t3 - 2 * t2 + t) * outTangent +
        (-2 * t3 + 3 * t2) * end +
        duration * (t3 - t2) * inTangent
    }

    return values
  }

  /**
   * @param {object} _object
   * @param {number[]} _values
   */
  apply(_object, _values) {}
}
