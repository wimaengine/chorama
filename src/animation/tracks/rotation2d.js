import { Object2D } from "../../objects/index.js"
import { AnimationTrack } from "../track.js"

export class Rotation2DAnimationTrack extends AnimationTrack {
  constructor() {
    super(1)
  }

  /**
   * @param {Object2D} object
   * @param {number[]} values
   * @override
   */
  apply(object, values) {
    if (!(object instanceof Object2D)) {
      return
    }

    const angle = /** @type {number} */ (values[0])
    object.transform.rotation.set(Math.cos(angle), Math.sin(angle))
  }
}
