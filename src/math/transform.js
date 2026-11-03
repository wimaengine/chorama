import { Vector2, Vector3, Rotary, Quaternion, Affine2, Affine3 } from "hisabati"

export class Transform2D {
  constructor() {
    this.world = new Affine2()
    this.position = new Vector2()
    this.rotation = new Rotary()
    this.scale = new Vector2(1, 1)
  }

  /**
   * @param {Transform2D} [parent]
   */
  updateMatrix(parent) {
    this.world.compose(
      this.position,
      this.rotation,
      this.scale
    )
    if (parent) {
      Affine2.multiply(parent.world, this.world, this.world)
    }
  }

  /**
   * @param {Transform2D} other
   */
  copy(other) {
    this.position.copy(other.position)
    this.rotation.copy(other.rotation)
    this.scale.copy(other.scale)
    this.world.copy(other.world)

    return this
  }

  clone() {
    return new Transform2D().copy(this)
  }
}

export class Transform3D {
  constructor() {
    this.world = new Affine3()
    this.position = new Vector3()
    this.orientation = new Quaternion()
    this.scale = new Vector3(1, 1, 1)
  }
  /**
   * @param {Transform3D} [parent]
   */
  updateMatrix(parent) {
    this.world.compose(
      this.position,
      this.orientation,
      this.scale
    )
    if(parent){
      Affine3.multiply(parent.world,this.world,this.world)
    }
  }

  /**
   * @param {Transform3D} other
   */
  copy(other){
    this.position.copy(other.position)
    this.orientation.copy(other.orientation)
    this.scale.copy(other.scale)
    this.world.copy(other.world)

    return this
  }
  clone(){
    return new Transform3D().copy(this)
  }
}
