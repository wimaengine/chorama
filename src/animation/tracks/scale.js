import { Object3D } from "../../objects/index.js"
import { AnimationTrack } from "../track.js"

export class ScaleAnimationTrack extends AnimationTrack {
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

    object.transform.scale.set(
      /** @type {number} */ (values[0]),
      /** @type {number} */ (values[1]),
      /** @type {number} */ (values[2])
    )
  }
}
