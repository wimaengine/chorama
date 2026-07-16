// @ts-check
import { MeshBuilder } from "./base.js"
import { ExtrudeMeshBuilder } from "./extrude.js"
import { regularPolygonPoints } from "./geometry.js"

export class PrismMeshBuilder extends MeshBuilder {
  sides = 6
  radius = 0.5
  depth = 1
  rotation = 0

  /** @override */
  build() {
    const builder = new ExtrudeMeshBuilder()
    builder.contour = regularPolygonPoints(this.sides, this.radius, this.rotation)
    builder.depth = this.depth
    return builder.build()
  }
}
