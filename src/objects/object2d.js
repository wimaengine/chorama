import { Transform2D } from "../math/index.js"
import { ObjectBase } from "./objectbase.js"

export class Object2D extends ObjectBase {
  transform = new Transform2D()

  /**
   * World-space depth used by 2D rendering.
   * @type {number}
   */
  zIndex = 0

  update() {
    const parent = this.parent instanceof Object2D ? this.parent : undefined
    this.transform.updateMatrix(parent?.transform)
  }

  /**
   * @override
   * @param {this} object
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(object, entityMap)
    this.transform.copy(object.transform)
    this.zIndex = object.zIndex
    return this
  }
}
