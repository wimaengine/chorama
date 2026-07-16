// @ts-check
import { Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { PolyhedronMeshBuilder } from "./polyhedron.js"

const tetrahedronVertices = [
  new Vector3(1, 1, 1),
  new Vector3(-1, -1, 1),
  new Vector3(-1, 1, -1),
  new Vector3(1, -1, -1)
]

const tetrahedronFaces = [
  [0, 2, 1],
  [0, 1, 3],
  [0, 3, 2],
  [1, 2, 3]
]

export class TetrahedronMeshBuilder extends MeshBuilder {
  radius = 0.5

  /**
   * @type {Set<number>}
   */
  excludeFaces = new Set()

  /** @override */
  build() {
    const builder = new PolyhedronMeshBuilder()
    builder.vertices = tetrahedronVertices
    builder.faces = tetrahedronFaces
    builder.excludeFaces = this.excludeFaces
    builder.radius = this.radius
    return builder.build()
  }
}
