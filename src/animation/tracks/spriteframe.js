import { Sprite2D } from "../../objects/index.js"
import { AnimationMode, AnimationTrack } from "../track.js"

export class SpriteFrameAnimationTrack extends AnimationTrack {
  constructor() {
    super(2)
    this.mode = AnimationMode.Step
  }

  /**
   * @param {Sprite2D} object
   * @param {number[]} values
   * @override
   */
  apply(object, values) {
    if (!(object instanceof Sprite2D)) {
      return
    }

    object.atlasIndex = /** @type {number} */ (values[0])
    object.sliceIndex = /** @type {number} */ (values[1])
  }
}
