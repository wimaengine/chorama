// @ts-check
import { FrustumMeshBuilder } from "./frustum.js"

export class CylinderMeshBuilder {
  radius = 0.5

  height = 1
  radialSegments = 32
  heightSegments = 1
  arcStart = 0
  arcLength = Math.PI * 2

  /**
   * @type {CylinderOpenEnds}
   */
  openEnds = {
    top: false,
    bottom: false
  }

  build3d() {
    const builder = new FrustumMeshBuilder()
    builder.radiusTop = this.radius
    builder.radiusBottom = this.radius
    builder.height = this.height
    builder.radialSegments = this.radialSegments
    builder.heightSegments = this.heightSegments
    builder.arcStart = this.arcStart
    builder.arcLength = this.arcLength
    builder.openEnds = this.openEnds
    return builder.build3d()
  }
}

/**
 * @typedef CylinderOpenEnds
 * @property {boolean} top
 * @property {boolean} bottom
 */
