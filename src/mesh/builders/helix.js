// @ts-check
import { Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { TubeMeshBuilder } from "./tube.js"

export class HelixMeshBuilder extends MeshBuilder {
  radius = 0.5
  tubeRadius = 0.1
  turns = 3
  height = 2
  radialSegments = 8
  pathSegments = 128

  /** @override */
  build() {
    /** @type {Vector3[]} */
    const points = []
    for (let i = 0; i <= this.pathSegments; i++) {
      const t = i / this.pathSegments
      const angle = t * this.turns * Math.PI * 2
      points.push(new Vector3(
        Math.cos(angle) * this.radius,
        (t - 0.5) * this.height,
        Math.sin(angle) * this.radius
      ))
    }

    const builder = new TubeMeshBuilder()
    builder.points = points
    builder.radius = this.tubeRadius
    builder.radialSegments = this.radialSegments
    builder.closed = false
    return builder.build()
  }
}
