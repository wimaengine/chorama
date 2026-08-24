import { Color, Vector3 } from '../../math/index.js'
import { Object3D } from '../object3d.js'
import { OrthographicShadow } from './shadow/index.js'

export class DirectionalLight extends Object3D {
  static BlockSize = 12 * Float32Array.BYTES_PER_ELEMENT

  intensity = 1.0
  color = new Color()

  /**
   * @type {OrthographicShadow | undefined}
   */
  shadow

  /**
   * Packs the directional light block into the supplied data view.
   *
   * @param {DataView} data
   */
  pack(data) {
    const direction = this.transform.world.transformWithoutTranslation(new Vector3(0, 0, -1))
    const floats = new Float32Array(data.buffer, data.byteOffset, 12)

    floats[0] = this.color.r
    floats[1] = this.color.g
    floats[2] = this.color.b
    floats[3] = this.color.a
    floats[4] = direction.x
    floats[5] = direction.y
    floats[6] = direction.z
    floats[7] = this.intensity
  }

  /**
   * @override
   * @param {DirectionalLight} object
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(/** @type {any} */ (object), entityMap)
    this.intensity = object.intensity
    this.color.copy(object.color)
    this.shadow = object.shadow
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
