// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { createMesh3dFromArrays, createMesh2dFromArrays } from "./geometry.js"
import { pushVertex } from "./utils.js"

export class RingMeshBuilder extends MeshBuilder {
  innerRadius = 0.25
  outerRadius = 0.5
  thickness = 0.1
  radialSegments = 32

  /** @override */
  build3d() {
    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const normals = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []
    const halfThickness = this.thickness * 0.5
    const innerRadius = Math.min(this.innerRadius, this.outerRadius)
    const outerRadius = Math.max(this.innerRadius, this.outerRadius)
    const step = (Math.PI * 2) / this.radialSegments
    const topNormal = new Vector3(0, 1, 0)
    const bottomNormal = new Vector3(0, -1, 0)

    /**
     * @param {Vector3} point
     * @returns {Vector2}
     */
    const topUv = (point) => new Vector2(
      (point.x + outerRadius) / (outerRadius * 2),
      (point.z + outerRadius) / (outerRadius * 2)
    )

    for (let segment = 0; segment < this.radialSegments; segment++) {
      const angle0 = segment * step
      const angle1 = (segment + 1) * step
      const cos0 = Math.cos(angle0)
      const sin0 = Math.sin(angle0)
      const cos1 = Math.cos(angle1)
      const sin1 = Math.sin(angle1)

      const outer0Top = new Vector3(outerRadius * cos0, halfThickness, outerRadius * sin0)
      const outer1Top = new Vector3(outerRadius * cos1, halfThickness, outerRadius * sin1)
      const inner0Top = new Vector3(innerRadius * cos0, halfThickness, innerRadius * sin0)
      const inner1Top = new Vector3(innerRadius * cos1, halfThickness, innerRadius * sin1)

      const outer0Bottom = new Vector3(outerRadius * cos0, -halfThickness, outerRadius * sin0)
      const outer1Bottom = new Vector3(outerRadius * cos1, -halfThickness, outerRadius * sin1)
      const inner0Bottom = new Vector3(innerRadius * cos0, -halfThickness, innerRadius * sin0)
      const inner1Bottom = new Vector3(innerRadius * cos1, -halfThickness, innerRadius * sin1)

      const outerNormal0 = new Vector3(cos0, 0, sin0)
      const outerNormal1 = new Vector3(cos1, 0, sin1)
      const innerNormal0 = new Vector3(-cos0, 0, -sin0)
      const innerNormal1 = new Vector3(-cos1, 0, -sin1)

      const outerUv0 = segment / this.radialSegments
      const outerUv1 = (segment + 1) / this.radialSegments

      // Top face
      pushVertex(positions, normals, uvs, indices, outer0Top, topNormal, topUv(outer0Top))
      pushVertex(positions, normals, uvs, indices, inner0Top, topNormal, topUv(inner0Top))
      pushVertex(positions, normals, uvs, indices, outer1Top, topNormal, topUv(outer1Top))

      pushVertex(positions, normals, uvs, indices, outer1Top, topNormal, topUv(outer1Top))
      pushVertex(positions, normals, uvs, indices, inner0Top, topNormal, topUv(inner0Top))
      pushVertex(positions, normals, uvs, indices, inner1Top, topNormal, topUv(inner1Top))

      // Bottom face
      pushVertex(positions, normals, uvs, indices, outer0Bottom, bottomNormal, topUv(outer0Bottom))
      pushVertex(positions, normals, uvs, indices, outer1Bottom, bottomNormal, topUv(outer1Bottom))
      pushVertex(positions, normals, uvs, indices, inner0Bottom, bottomNormal, topUv(inner0Bottom))

      pushVertex(positions, normals, uvs, indices, outer1Bottom, bottomNormal, topUv(outer1Bottom))
      pushVertex(positions, normals, uvs, indices, inner1Bottom, bottomNormal, topUv(inner1Bottom))
      pushVertex(positions, normals, uvs, indices, inner0Bottom, bottomNormal, topUv(inner0Bottom))

      // Outer wall
      pushVertex(positions, normals, uvs, indices, outer0Top, outerNormal0, new Vector2(outerUv0, 1))
      pushVertex(positions, normals, uvs, indices, outer1Top, outerNormal1, new Vector2(outerUv1, 1))
      pushVertex(positions, normals, uvs, indices, outer0Bottom, outerNormal0, new Vector2(outerUv0, 0))

      pushVertex(positions, normals, uvs, indices, outer1Top, outerNormal1, new Vector2(outerUv1, 1))
      pushVertex(positions, normals, uvs, indices, outer1Bottom, outerNormal1, new Vector2(outerUv1, 0))
      pushVertex(positions, normals, uvs, indices, outer0Bottom, outerNormal0, new Vector2(outerUv0, 0))

      // Inner wall
      pushVertex(positions, normals, uvs, indices, inner0Top, innerNormal0, new Vector2(outerUv0, 1))
      pushVertex(positions, normals, uvs, indices, inner0Bottom, innerNormal0, new Vector2(outerUv0, 0))
      pushVertex(positions, normals, uvs, indices, inner1Top, innerNormal1, new Vector2(outerUv1, 1))

      pushVertex(positions, normals, uvs, indices, inner1Top, innerNormal1, new Vector2(outerUv1, 1))
      pushVertex(positions, normals, uvs, indices, inner0Bottom, innerNormal0, new Vector2(outerUv0, 0))
      pushVertex(positions, normals, uvs, indices, inner1Bottom, innerNormal1, new Vector2(outerUv1, 0))
    }

    return createMesh3dFromArrays({
      positions,
      normals,
      uvs,
      indices
    })
  }

  /**
   * Builds the flat annulus represented by the ring's inner and outer radii.
   * The 3D-only thickness property is ignored.
   *
   * @override
   */
  build2d() {
    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []
    const innerRadius = Math.min(this.innerRadius, this.outerRadius)
    const outerRadius = Math.max(this.innerRadius, this.outerRadius)
    const step = (Math.PI * 2) / this.radialSegments

    /**
     * @param {number} x
     * @param {number} y
     * @returns {Vector2}
     */
    const uv = (x, y) => new Vector2(
      (x + outerRadius) / (outerRadius * 2),
      (y + outerRadius) / (outerRadius * 2)
    )

    for (let segment = 0; segment < this.radialSegments; segment++) {
      const angle0 = segment * step
      const angle1 = (segment + 1) * step
      const cos0 = Math.cos(angle0)
      const sin0 = Math.sin(angle0)
      const cos1 = Math.cos(angle1)
      const sin1 = Math.sin(angle1)
      const outer0 = new Vector2(outerRadius * cos0, outerRadius * sin0)
      const outer1 = new Vector2(outerRadius * cos1, outerRadius * sin1)
      const inner0 = new Vector2(innerRadius * cos0, innerRadius * sin0)
      const inner1 = new Vector2(innerRadius * cos1, innerRadius * sin1)
      const base = positions.length / 2

      positions.push(
        outer0.x, outer0.y,
        inner0.x, inner0.y,
        outer1.x, outer1.y,
        inner1.x, inner1.y
      )

      for (const point of [outer0, inner0, outer1, inner1]) {
        const pointUv = uv(point.x, point.y)
        uvs.push(pointUv.x, pointUv.y)
      }

      indices.push(
        base, base + 2, base + 1,
        base + 2, base + 3, base + 1
      )
    }

    return createMesh2dFromArrays({
      positions,
      uvs,
      indices
    })
  }
}
