import { Object3D } from "../../objects/index.js"
import { AnimationTrack } from "../track.js"

export class PositionAnimationTrack extends AnimationTrack {
  constructor() {
    super(3)
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

    object.transform.position.set(
      /** @type {number} */ (values[0]),
      /** @type {number} */ (values[1]),
      /** @type {number} */ (values[2])
    )
  }
}
