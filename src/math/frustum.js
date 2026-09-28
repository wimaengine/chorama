import { Vector3 } from "hisabati"

export class Plane {
  normal = new Vector3()
  distance = 0

  /**
   * @param {Vector3} [normal] The normalized plane normal.
   * @param {number} [distance]
   */
  constructor(normal = new Vector3(), distance = 0) {
    this.set(normal, distance)
  }

  /**
   * @param {Vector3} normal The normalized plane normal.
   * @param {number} distance
   */
  set(normal, distance) {
    this.normal.set(normal.x, normal.y, normal.z)
    this.distance = distance
    return this
  }

  /**
   * @param {Vector3} point
   */
  distanceToPoint(point) {
    return this.normal.x * point.x + this.normal.y * point.y + this.normal.z * point.z + this.distance
  }
}

export class Frustum {
  /**
   * @type {[Plane, Plane, Plane, Plane, Plane, Plane]}
   */
  planes = [new Plane(), new Plane(), new Plane(), new Plane(), new Plane(), new Plane()]

  /**
   * @param {import('hisabati').Matrix4} matrix
   */
  setFromMatrix(matrix) {
    const planes = this.planes
    planes[0].set(
      new Vector3(matrix.d + matrix.a, matrix.h + matrix.e, matrix.l + matrix.i),
      matrix.p + matrix.m
    )
    planes[1].set(
      new Vector3(matrix.d - matrix.a, matrix.h - matrix.e, matrix.l - matrix.i),
      matrix.p - matrix.m
    )
    planes[2].set(
      new Vector3(matrix.d + matrix.b, matrix.h + matrix.f, matrix.l + matrix.j),
      matrix.p + matrix.n
    )
    planes[3].set(
      new Vector3(matrix.d - matrix.b, matrix.h - matrix.f, matrix.l - matrix.j),
      matrix.p - matrix.n
    )
    planes[4].set(
      new Vector3(matrix.d + matrix.c, matrix.h + matrix.g, matrix.l + matrix.k),
      matrix.p + matrix.o
    )
    planes[5].set(
      new Vector3(matrix.d - matrix.c, matrix.h - matrix.g, matrix.l - matrix.k),
      matrix.p - matrix.o
    )
    return this
  }

}
