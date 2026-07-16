// @ts-check
import { Vector3 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { PolyhedronMeshBuilder } from "./polyhedron.js"

const icosahedronVertices = [
  new Vector3(-1, 1.618033988749895, 0),
  new Vector3(1, 1.618033988749895, 0),
  new Vector3(-1, -1.618033988749895, 0),
  new Vector3(1, -1.618033988749895, 0),
  new Vector3(0, -1, 1.618033988749895),
  new Vector3(0, 1, 1.618033988749895),
  new Vector3(0, -1, -1.618033988749895),
  new Vector3(0, 1, -1.618033988749895),
  new Vector3(1.618033988749895, 0, -1),
  new Vector3(1.618033988749895, 0, 1),
  new Vector3(-1.618033988749895, 0, -1),
  new Vector3(-1.618033988749895, 0, 1)
]

const icosahedronFaces = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1]
]

export class IcosahedronMeshBuilder extends MeshBuilder {
  radius = 0.5

  /**
   * @type {Set<number>}
   */
  excludeFaces = new Set()

  /** @override */
  build() {
    const builder = new PolyhedronMeshBuilder()
    builder.vertices = icosahedronVertices
    builder.faces = icosahedronFaces
    builder.excludeFaces = this.excludeFaces
    builder.radius = this.radius
    return builder.build()
  }
}
