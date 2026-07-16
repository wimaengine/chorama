// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"

export class LatheMeshBuilder extends MeshBuilder {
  /**
   * Profile points in the X/Y plane. X is the radius from the revolution axis.
   * @type {Vector2[]}
   */
  profile = []
  segments = 32
  phiStart = 0
  phiLength = Math.PI * 2

  /** @override */
  build() {
    const profile = this.profile

    if (profile.length < 2) {
      return createMeshFromArrays({ positions: [] })
    }

    const positions = []
    const normals = []
    const uvs = []
    const indices = []
    const columnCount = this.segments + 1

    for (let i = 0; i < profile.length; i++) {
      const current = profile[i]
      assert(current, `Missing lathe profile point ${i}`)
      const previous = i > 0 ? profile[i - 1] : current
      assert(previous, `Missing previous lathe profile point ${i - 1}`)
      const next = i < profile.length - 1 ? profile[i + 1] : current
      assert(next, `Missing next lathe profile point ${i + 1}`)

      const tangent = next.clone().subtract(previous).normalize()
      const normal = new Vector2(tangent.y, -tangent.x).normalize()

      for (let segment = 0; segment < columnCount; segment++) {
        const t = segment / this.segments
        const angle = this.phiStart + t * this.phiLength
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)

        const position = new Vector3(
          current.x * cos,
          current.y,
          current.x * sin
        )

        const surfaceNormal = new Vector3(
          normal.x * cos,
          normal.y,
          normal.x * sin
        ).normalize()

        positions.push(position.x, position.y, position.z)
        normals.push(surfaceNormal.x, surfaceNormal.y, surfaceNormal.z)
        uvs.push(t, i / (profile.length - 1))
      }
    }

    for (let i = 0; i < profile.length - 1; i++) {
      for (let segment = 0; segment < this.segments; segment++) {
        const a = i * columnCount + segment
        const b = (i + 1) * columnCount + segment
        const c = (i + 1) * columnCount + segment + 1
        const d = i * columnCount + segment + 1

        indices.push(a, b, d)
        indices.push(b, c, d)
      }
    }

    return createMeshFromArrays({
      positions,
      normals,
      uvs,
      indices
    })
  }
}
