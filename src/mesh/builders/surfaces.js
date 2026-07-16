// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"

export class TorusMeshBuilder extends MeshBuilder {
  radius = 0.75
  tubeRadius = 0.25
  radialSegments = 32
  tubularSegments = 16

  /** @override */
  build() {
    const positions = []
    const normals = []
    const uvs = []
    const indices = []

    for (let tube = 0; tube <= this.tubularSegments; tube++) {
      const v = tube / this.tubularSegments
      const phi = v * Math.PI * 2
      const cosphi = Math.cos(phi)
      const sinphi = Math.sin(phi)

      for (let radial = 0; radial <= this.radialSegments; radial++) {
        const u = radial / this.radialSegments
        const theta = u * Math.PI * 2
        const costheta = Math.cos(theta)
        const sintheta = Math.sin(theta)

        const ringRadius = this.radius + this.tubeRadius * cosphi
        const position = new Vector3(
          ringRadius * costheta,
          this.tubeRadius * sinphi,
          ringRadius * sintheta
        )
        const normal = new Vector3(
          cosphi * costheta,
          sinphi,
          cosphi * sintheta
        )
        const uv = new Vector2(1 - u, 1 - v)

        positions.push(position.x, position.y, position.z)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(uv.x, uv.y)
      }
    }

    for (let tube = 0; tube < this.tubularSegments; tube++) {
      for (let radial = 0; radial < this.radialSegments; radial++) {
        const a = tube * (this.radialSegments + 1) + radial
        const b = (tube + 1) * (this.radialSegments + 1) + radial
        const c = (tube + 1) * (this.radialSegments + 1) + radial + 1
        const d = tube * (this.radialSegments + 1) + radial + 1

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
