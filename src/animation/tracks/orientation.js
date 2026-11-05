import { Quaternion } from "../../math/index.js"
import { Object3D } from "../../objects/index.js"
import { AnimationMode, AnimationTrack } from "../track.js"

export class OrientationAnimationTrack extends AnimationTrack {
  constructor() {
    super(4)
  }

  /**
   * @param {number} indexA
   * @param {number} indexB
   * @param {number} t
   * @returns {number[]}
   * @override
   */
  interpolateFrame(indexA, indexB, t) {
    switch (this.mode) {
      case AnimationMode.Step:
        return this.readFrame(indexA)
      case AnimationMode.Cubic: {
        const values = this.interpolateCubicFrame(indexA, indexB, t)
        const length = Math.hypot(
          /** @type {number} */ (values[0]),
          /** @type {number} */ (values[1]),
          /** @type {number} */ (values[2]),
          /** @type {number} */ (values[3])
        )

        if (length > 0) {
          const inverseLength = 1 / length
          values[0] = /** @type {number} */ (values[0]) * inverseLength
          values[1] = /** @type {number} */ (values[1]) * inverseLength
          values[2] = /** @type {number} */ (values[2]) * inverseLength
          values[3] = /** @type {number} */ (values[3]) * inverseLength
        }

        return values
      }
      case AnimationMode.Linear:
      default:
        break
    }

    const start = this.readFrame(indexA)
    const end = this.readFrame(indexB)

    const quaternionStart = new Quaternion().set(
      /** @type {number} */ (start[0]),
      /** @type {number} */ (start[1]),
      /** @type {number} */ (start[2]),
      /** @type {number} */ (start[3])
    )
    const quaternionEnd = new Quaternion().set(
      /** @type {number} */ (end[0]),
      /** @type {number} */ (end[1]),
      /** @type {number} */ (end[2]),
      /** @type {number} */ (end[3])
    )
    const quaternionOut = new Quaternion()

    Quaternion.slerp(quaternionStart, quaternionEnd, t, quaternionOut)
    Quaternion.normalize(quaternionOut, quaternionOut)

    return [
      quaternionOut.x,
      quaternionOut.y,
      quaternionOut.z,
      quaternionOut.w
    ]
  }

  /**
   * @param {Object3D} object
   * @param {number[]} values
   * @override
   */
  apply(object, values) {
    if (!(object instanceof Object3D)) {
      return
    }

    object.transform.orientation.set(
      /** @type {number} */ (values[0]),
      /** @type {number} */ (values[1]),
      /** @type {number} */ (values[2]),
      /** @type {number} */ (values[3])
    )
  }
}
