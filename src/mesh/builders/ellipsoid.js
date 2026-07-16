// @ts-check
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"

export class EllipsoidMeshBuilder extends MeshBuilder {
  radiusX = 0.5
  radiusY = 0.5
  radiusZ = 0.5
  longitudeSegments = 32
  latitudeSegments = 32

  /** @override */
  build() {
    const positions = []
    const normals = []
    const uvs = []
    const indices = []

    for (let i = 0; i <= this.latitudeSegments; i++) {
      const v = i / this.latitudeSegments
      const phi = Math.PI * (v - 0.5)
      const cosphi = Math.cos(phi)
      const sinphi = Math.sin(phi)

      for (let j = 0; j <= this.longitudeSegments; j++) {
        const u = j / this.longitudeSegments
        const theta = u * Math.PI * 2
        const costheta = Math.cos(theta)
        const sintheta = Math.sin(theta)

        const x = this.radiusX * costheta * cosphi
        const y = this.radiusY * sinphi
        const z = this.radiusZ * sintheta * cosphi

        let nx = costheta * cosphi / (this.radiusX || 1)
        let ny = sinphi / (this.radiusY || 1)
        let nz = sintheta * cosphi / (this.radiusZ || 1)
        const normalLength = Math.hypot(nx, ny, nz) || 1
        nx /= normalLength
        ny /= normalLength
        nz /= normalLength

        positions.push(x, y, z)
        normals.push(nx, ny, nz)
        uvs.push(1 - u, 1 - v)
      }
    }

    for (let i = 0; i < this.latitudeSegments; i++) {
      for (let j = 0; j < this.longitudeSegments; j++) {
        const a = i * (this.longitudeSegments + 1) + j
        const b = a + this.longitudeSegments + 1
        indices.push(a, a + 1, b)
        indices.push(b, a + 1, b + 1)
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
