import { Color } from '../../math/index.js'
import { Object3D } from '../object3d.js'

export class AmbientLight extends Object3D {
  intensity = 1
  color = new Color(1, 1, 1)

  getData() {
    return {
      name: "AmbientLightBlock",
      data: new Float32Array([
        this.intensity,
        0,
        0,
        0,
        ...this.color
      ]).buffer
    }
  }

  /**
   * @override
   * @param {AmbientLight} object
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(/** @type {any} */ (object), entityMap)
    this.intensity = object.intensity
    this.color.copy(object.color)
    return this
  }

  /**
   * @override
   * @param {Map<Object3D, Object3D>} [entityMap]
   * @returns {this}
   */
  clone(entityMap) {
    return super.clone(entityMap)
  }
}
