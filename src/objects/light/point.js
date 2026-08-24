import { Color, Vector3 } from '../../math/index.js'
import { Object3D } from '../object3d.js'
import { SpotLightShadow } from './shadow/index.js'

export class PointLight extends Object3D {
  static BlockSize = 12 * Float32Array.BYTES_PER_ELEMENT

  color = new Color()
  radius = 1.0
  decay = 2
  intensity = 1.0

  /**
   * @type {SpotLightShadow | undefined}
   */
  shadow

  /**
   * Packs the point light block into the supplied data view.
   *
   * @param {DataView} data
   */
  pack(data) {
    const worldPosition = new Vector3(
      this.transform.world.x,
      this.transform.world.y,
      this.transform.world.z
    )
    const floats = new Float32Array(data.buffer, data.byteOffset, 12)

    floats[0] = this.color.r
    floats[1] = this.color.g
    floats[2] = this.color.b
    floats[3] = this.color.a
    floats[4] = worldPosition.x
    floats[5] = worldPosition.y
    floats[6] = worldPosition.z
    floats[7] = this.intensity
    floats[8] = Math.max(0, this.radius)
    floats[9] = this.decay
  }

  /**
   * @override
   * @param {PointLight} object
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(/** @type {any} */ (object), entityMap)
    this.color.copy(object.color)
    this.radius = object.radius
    this.decay = object.decay
    this.intensity = object.intensity
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
