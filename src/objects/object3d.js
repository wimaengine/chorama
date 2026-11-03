import { Transform3D } from "../math/index.js"
import { ObjectBase, RenderMask } from "./objectbase.js"

export class Object3D extends ObjectBase {

  /**
   * @override
   * @type {Object3D[]}
   */
  children = []

  transform = new Transform3D()

  update() {
    const parentTransform = this.parent instanceof Object3D ? this.parent?.transform : undefined
    this.transform.updateMatrix(parentTransform)
  }

  /**
   * @override
   * @param {(object: Object3D) => boolean} func
   */
  traverseBFS(func) {
    super.traverseBFS(/** @type {(object: ObjectBase) => boolean} */(func))
  }

  /**
   * @override
   * @param {(object: Object3D) => boolean} func
   */
  traverseDFS(func) {
    super.traverseDFS(/** @type {(object: ObjectBase) => boolean} */(func))
  }

  /**
   * @override
   * @param {this} object
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(object, entityMap)
    this.transform.copy(object.transform)
    return this
  }
}

export { ObjectBase, RenderMask }
