import { Color } from '../../math/index.js'
import { Object3D } from '../object3d.js'

export class AmbientLight extends Object3D {
  intensity = 1
  color = new Color(1, 1, 1)

  /**
   * Packs the ambient light block into the supplied data view.
   *
   * @param {DataView} data
   */
  getData(data) {
    const floats = new Float32Array(data.buffer, data.byteOffset, 8)

    floats[0] = this.intensity
    floats[4] = this.color.r
    floats[5] = this.color.g
    floats[6] = this.color.b
    floats[7] = this.color.a
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
