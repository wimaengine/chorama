// @ts-check
import { Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { TubeMeshBuilder } from "./tube.js"

export class TorusKnotMeshBuilder extends MeshBuilder {
  radius = 0.75
  knotRadius = 0.25
  tubeRadius = 0.08
  p = 2
  q = 3
  radialSegments = 8
  pathSegments = 256

  /** @override */
  build() {
    /** @type {Vector3[]} */
    const points = []
    for (let i = 0; i < this.pathSegments; i++) {
      const t = (i / this.pathSegments) * Math.PI * 2
      const radial = this.radius + this.knotRadius * Math.cos(this.q * t)
      points.push(new Vector3(
        radial * Math.cos(this.p * t),
        radial * Math.sin(this.p * t),
        this.knotRadius * Math.sin(this.q * t)
      ))
    }

    const builder = new TubeMeshBuilder()
    builder.points = points
    builder.radius = this.tubeRadius
    builder.radialSegments = this.radialSegments
    builder.closed = true
    return builder.build()
  }
}
