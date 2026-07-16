// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"

export class TerrainMeshBuilder extends MeshBuilder {
  width = 1
  depth = 1
  widthSegments = 32
  depthSegments = 32
  heightScale = 1
  /**
   * @type {(x: number, z: number) => number}
   */
  sampleHeight = () => 0

  /** @override */
  build() {
    const positions = []
    const normals = []
    const uvs = []
    const indices = []
    const widthStep = this.width / this.widthSegments
    const depthStep = this.depth / this.depthSegments
    const halfWidth = this.width * 0.5
    const halfDepth = this.depth * 0.5

    /**
     * @param {number} x
     * @param {number} z
     * @returns {number}
     */
    const heightAt = (x, z) => this.sampleHeight(x, z) * this.heightScale

    for (let zIndex = 0; zIndex <= this.depthSegments; zIndex++) {
      const v = zIndex / this.depthSegments
      const z = -halfDepth + v * this.depth

      for (let xIndex = 0; xIndex <= this.widthSegments; xIndex++) {
        const u = xIndex / this.widthSegments
        const x = -halfWidth + u * this.width
        const height = heightAt(x, z)

        const hL = heightAt(x - widthStep, z)
        const hR = heightAt(x + widthStep, z)
        const hD = heightAt(x, z - depthStep)
        const hU = heightAt(x, z + depthStep)
        const normal = new Vector3(
          (hL - hR) / (widthStep || 1),
          2,
          (hD - hU) / (depthStep || 1)
        ).normalize()
        const uv = new Vector2(u, 1 - v)

        positions.push(x, height, z)
        normals.push(normal.x, normal.y, normal.z)
        uvs.push(uv.x, uv.y)
      }
    }

    for (let zIndex = 0; zIndex < this.depthSegments; zIndex++) {
      for (let xIndex = 0; xIndex < this.widthSegments; xIndex++) {
        const a = zIndex * (this.widthSegments + 1) + xIndex
        const b = (zIndex + 1) * (this.widthSegments + 1) + xIndex
        const c = (zIndex + 1) * (this.widthSegments + 1) + xIndex + 1
        const d = zIndex * (this.widthSegments + 1) + xIndex + 1

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
