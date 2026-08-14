import { Color, Vector3 } from '../../math/index.js'
import { Object3D } from '../object3d.js'
import { SpotLightShadow } from './shadow/index.js'

export class SpotLight extends Object3D {
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

  pack() {
    const direction = this.transform.world.transformWithoutTranslation(
      new Vector3(0, 0, -1)
    )
    const halfInnerAngle = this.innerAngle / 2
    const halfOuterAngle = this.outerAngle / 2

    return [
      ...this.color,
      this.transform.world.x,
      this.transform.world.y,
      this.transform.world.z,
      0,
      ...direction,
      this.intensity,
      this.range,
      this.decay,
      Math.cos(Math.min(halfInnerAngle, halfOuterAngle)),
      Math.cos(halfOuterAngle)
    ]
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
