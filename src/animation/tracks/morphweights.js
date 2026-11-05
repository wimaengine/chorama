import { MeshMaterial3D, Object3D } from "../../objects/index.js"
import { AnimationTrack } from "../track.js"

export class MorphWeightsAnimationTrack extends AnimationTrack {
  /**
   * @param {number} [size=0]
   */
  constructor(size = 0) {
    super(size)
  }

  /**
   * @param {Object3D} object
   * @param {number[]} values
   * @override
   */
  apply(object, values) {
    const size = this.elementSize()
    const applyTo = /** @param {MeshMaterial3D} mesh */ (mesh) => {
      const morphWeights = mesh.morphWeights

      if (morphWeights === undefined) {
        return
      }

      for (let i = 0; i < size; i++) {
        morphWeights[i] = /** @type {number} */ (values[i])
      }
    }

    if (object instanceof MeshMaterial3D) {
      applyTo(object)
      return
    }

    const children = object.children

    for (let i = 0; i < children.length; i++) {
      const child = /** @type {Object3D} */ (children[i])

      if (child instanceof MeshMaterial3D) {
        applyTo(child)
      }
    }
  }
}
