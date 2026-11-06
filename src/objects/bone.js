import { Object2D } from "./object2d.js"
import { Object3D } from "./object3d.js"

export class Bone2D extends Object2D {
  index = -1

  /**
   * @override
   * @param {Map<Object2D, Object2D>} [entityMap]
   */
  clone(entityMap) {
    const clone = super.clone(entityMap)

    clone.index = this.index

    return clone
  }
}

export class Bone3D extends Object3D {
  index = -1

  /**
   * @override
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  clone(entityMap) {
    const clone = super.clone(entityMap)

    clone.index = this.index

    return clone
  }
}
