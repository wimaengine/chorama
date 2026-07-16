// @ts-check
import { MeshBuilder } from "./base.js"
import { CylinderMeshBuilder } from "./cylinder.js"

export class ConeMeshBuilder extends MeshBuilder {
  radiusBottom = 0.5
  height = 1
  radialSegments = 32
  heightSegments = 1
  arcStart = 0
  arcLength = Math.PI * 2

  /** @override */
  build() {
    const builder = new CylinderMeshBuilder()
    builder.radiusTop = 0
    builder.radiusBottom = this.radiusBottom
    builder.height = this.height
    builder.radialSegments = this.radialSegments
    builder.heightSegments = this.heightSegments
    builder.arcStart = this.arcStart
    builder.arcLength = this.arcLength
    builder.openEnds = {
      top: true,
      bottom: false
    }
    return builder.build()
  }
}
