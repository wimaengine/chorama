// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays, signedArea2D } from "./geometry.js"
import { assert } from "../../utils/index.js"
import { getBounds, projectUV, pushTriangle } from "./utils.js"

export class ExtrudeMeshBuilder extends MeshBuilder {
  /**
   * Contour points in the XY plane. The shape is extruded along Z.
   * @type {Vector2[]}
   */
  contour = []
  depth = 1

  /** @override */
  build() {
    let contour = this.contour.slice()
    if (contour.length < 3) {
      return createMeshFromArrays({ positions: [] })
    }

    const firstPoint = contour[0]
    const lastPoint = contour[contour.length - 1]
    assert(firstPoint, "Extrude contour requires at least three points")
    assert(lastPoint, "Extrude contour requires at least three points")

    if (firstPoint.equals(lastPoint)) {
      contour = contour.slice(0, -1)
    }

    if (contour.length < 3) {
      return createMeshFromArrays({ positions: [] })
    }

    if (signedArea2D(contour) < 0) {
      contour = contour.reverse()
    }

    const bounds = getBounds(contour)
    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const normals = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []
    const halfDepth = this.depth * 0.5

    const center = new Vector2()
    for (const point of contour) {
      center.add(point)
    }
    center.divideScalar(contour.length)

    for (let i = 0; i < contour.length; i++) {
      const current = contour[i]
      assert(current, `Missing extrude contour point at index ${i}`)
      const next = contour[(i + 1) % contour.length]
      assert(next, `Missing extrude contour point at index ${(i + 1) % contour.length}`)

      const currentTop = new Vector3(current.x, current.y, halfDepth)
      const nextTop = new Vector3(next.x, next.y, halfDepth)
      const currentBottom = new Vector3(current.x, current.y, -halfDepth)
      const nextBottom = new Vector3(next.x, next.y, -halfDepth)

      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        new Vector3(center.x, center.y, halfDepth),
        currentTop,
        nextTop,
        new Vector3(0, 0, 1),
        new Vector2(0.5, 0.5),
        projectUV(current, bounds),
        projectUV(next, bounds)
      )

      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        new Vector3(center.x, center.y, -halfDepth),
        nextBottom,
        currentBottom,
        new Vector3(0, 0, -1),
        new Vector2(0.5, 0.5),
        projectUV(next, bounds),
        projectUV(current, bounds)
      )

      const edge = next.clone().subtract(current)
      const sideNormal = new Vector3(edge.y, -edge.x, 0).normalize()
      const u0 = i / contour.length
      const u1 = (i + 1) / contour.length

      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        currentTop,
        currentBottom,
        nextTop,
        sideNormal,
        new Vector2(u0, 1),
        new Vector2(u0, 0),
        new Vector2(u1, 1)
      )
      pushTriangle(
        positions,
        normals,
        uvs,
        indices,
        nextTop,
        currentBottom,
        nextBottom,
        sideNormal,
        new Vector2(u1, 1),
        new Vector2(u0, 0),
        new Vector2(u1, 0)
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
