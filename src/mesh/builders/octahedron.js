// @ts-check
import { Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { PolyhedronMeshBuilder } from "./polyhedron.js"

const octahedronVertices = [
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1)
]

const octahedronFaces = [
  [0, 2, 4],
  [2, 1, 4],
  [1, 3, 4],
  [3, 0, 4],
  [2, 0, 5],
  [1, 2, 5],
  [3, 1, 5],
  [0, 3, 5]
]

export class OctahedronMeshBuilder extends MeshBuilder {
  radius = 0.5

  /**
   * @type {Set<number>}
   */
  excludeFaces = new Set()

  /** @override */
  build() {
    const builder = new PolyhedronMeshBuilder()
    builder.vertices = octahedronVertices
    builder.faces = octahedronFaces
    builder.excludeFaces = this.excludeFaces
    builder.radius = this.radius
    return builder.build()
  }
}
