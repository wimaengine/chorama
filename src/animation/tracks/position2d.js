import { Object2D } from "../../objects/index.js"
import { AnimationTrack } from "../track.js"

export class Position2DAnimationTrack extends AnimationTrack {
  constructor() {
    super(2)
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

    object.transform.position.set(
      /** @type {number} */ (values[0]),
      /** @type {number} */ (values[1])
    )
  }
}
