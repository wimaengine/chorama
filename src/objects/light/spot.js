import { Color, Vector3 } from '../../math/index.js'
import { Object3D } from '../object3d.js'
import { SpotLightShadow } from './shadow/index.js'

export class SpotLight extends Object3D {
  static BlockSize = 16 * Float32Array.BYTES_PER_ELEMENT

  /**
   * @type {number}
   */
  intensity = 1.0
  /**
   * @type {Color}
   */
  color = new Color()
  /**
   * @type {number}
   */
  range = 1.0
  /**
   * @type {number}
   */
  decay = 2.0
  /**
   * @type {number}
   */
  innerAngle = 0
  /**
   * @type {number}
   */
  outerAngle = Math.PI / 2
  /**
   * @type {SpotLightShadow | undefined}
   */
  shadow

  /**
   * Packs the spot light block into the supplied data view.
   *
   * @param {DataView} data
   */
  pack(data) {
    const direction = this.transform.world.transformWithoutTranslation(
      new Vector3(0, 0, -1)
    )
    const halfInnerAngle = this.innerAngle / 2
    const halfOuterAngle = this.outerAngle / 2
    const floats = new Float32Array(data.buffer, data.byteOffset, 16)

    floats[0] = this.color.r
    floats[1] = this.color.g
    floats[2] = this.color.b
    floats[3] = this.color.a
    floats[4] = this.transform.world.x
    floats[5] = this.transform.world.y
    floats[6] = this.transform.world.z
    floats[8] = direction.x
    floats[9] = direction.y
    floats[10] = direction.z
    floats[11] = this.intensity
    floats[12] = this.range
    floats[13] = this.decay
    floats[14] = Math.cos(Math.min(halfInnerAngle, halfOuterAngle))
    floats[15] = Math.cos(halfOuterAngle)
  }

  /**
   * @override
   * @param {SpotLight} object
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  copy(object, entityMap) {
    super.copy(/** @type {any} */ (object), entityMap)
    this.intensity = object.intensity
    this.color.copy(object.color)
    this.range = object.range
    this.decay = object.decay
    this.innerAngle = object.innerAngle
    this.outerAngle = object.outerAngle
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
