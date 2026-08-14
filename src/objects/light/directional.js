import { Color, Vector3 } from '../../math/index.js'
import { Object3D } from '../object3d.js'
import { OrthographicShadow } from './shadow/index.js'

export class DirectionalLight extends Object3D {
  intensity = 1.0
  color = new Color()

  /**
   * @type {OrthographicShadow | undefined}
   */
  shadow

  /**
   */
  pack() {
    const direction = this.transform.world.transformWithoutTranslation(new Vector3(0, 0, -1))

    return [
      ...this.color,
      ...direction,
      this.intensity,
      0,
      0,
      0,
      0
    ]
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
