// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays, regularPolygonPoints, signedArea2D } from "./geometry.js"
import { assert } from "../../utils/index.js"
import { faceNormal, getBounds, projectUV, pushTriangle } from "./utils.js"

export class PyramidMeshBuilder extends MeshBuilder {
  sides = 4
  radius = 0.5
  height = 1
  rotation = 0

  /** @override */
  build() {
    const contour = regularPolygonPoints(this.sides, this.radius, this.rotation)
    if (contour.length < 3) {
      return createMeshFromArrays({ positions: [] })
    }

    if (signedArea2D(contour) < 0) {
      contour.reverse()
    }

    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const normals = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []
    const halfHeight = this.height * 0.5
    const apex = new Vector3(0, 0, halfHeight)
    const baseCenter = new Vector3(0, 0, -halfHeight)
    const bounds = getBounds(contour)

    for (let i = 0; i < contour.length; i++) {
      const current = contour[i]
      assert(current, `Missing pyramid contour point at index ${i}`)
      const next = contour[(i + 1) % contour.length]
      assert(next, `Missing pyramid contour point at index ${(i + 1) % contour.length}`)
      const currentTop = new Vector3(current.x, current.y, -halfHeight)
      const nextTop = new Vector3(next.x, next.y, -halfHeight)
      const normal = faceNormal(currentTop, nextTop, apex)

      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        currentTop,
        nextTop,
        apex,
        normal,
        projectUV(current, bounds),
        projectUV(next, bounds),
        new Vector2(0.5, 0.5)
      )
    }

    for (let i = 0; i < contour.length; i++) {
      const current = contour[i]
      assert(current, `Missing pyramid contour point at index ${i}`)
      const next = contour[(i + 1) % contour.length]
      assert(next, `Missing pyramid contour point at index ${(i + 1) % contour.length}`)

      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        baseCenter,
        new Vector3(next.x, next.y, -halfHeight),
        new Vector3(current.x, current.y, -halfHeight),
        new Vector3(0, 0, -1),
        new Vector2(0.5, 0.5),
        projectUV(next, bounds),
        projectUV(current, bounds)
      )
    }

    return createMeshFromArrays({
      positions,
      normals,
      uvs,
      indices
    })
  }
}
