// @ts-check
import { Vector2 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { ExtrudeMeshBuilder } from "./extrude.js"

export class WedgeMeshBuilder extends MeshBuilder {
  width = 1
  height = 1
  depth = 1

  /** @override */
  build() {
    const builder = new ExtrudeMeshBuilder()
    builder.contour = [
      new Vector2(-this.width * 0.5, -this.height * 0.5),
      new Vector2(this.width * 0.5, -this.height * 0.5),
      new Vector2(-this.width * 0.5, this.height * 0.5)
    ]
    builder.depth = this.depth
    return builder.build()
  }
}
