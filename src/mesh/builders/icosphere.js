// @ts-check
import { Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays, sphericalUV } from "./geometry.js"

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

export class IcosphereMeshBuilder extends MeshBuilder {
  radius = 0.5
  subdivisions = 1

  /** @override */
  build() {
    let vertices = icosahedronVertices.map((vertex) => vertex.clone().normalize())
    let faces = icosahedronFaces.map((face) => face.slice())

    for (let subdivision = 0; subdivision < this.subdivisions; subdivision++) {
      const midpointCache = new Map()
      /** @type {number[][]} */
      const nextFaces = []

      /**
       * @param {number} a
       * @param {number} b
       * @returns {number}
       */
      const midpointIndex = (a, b) => {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        const cached = midpointCache.get(key)
        if (cached !== undefined) {
          return cached
        }

        const vertexA = vertices[a]
        const vertexB = vertices[b]
        assert(vertexA, `Missing icosahedron vertex at index ${a}`)
        assert(vertexB, `Missing icosahedron vertex at index ${b}`)
        const midpoint = vertexA.clone().add(vertexB).divideScalar(2).normalize()
        const index = vertices.push(midpoint) - 1
        midpointCache.set(key, index)
        return index
      }

      for (const face of faces) {
        const a = face[0]
        const b = face[1]
        const c = face[2]
        assert(a, "Icosahedron subdivision face requires at least three vertices")
        assert(b, "Icosahedron subdivision face requires at least three vertices")
        assert(c, "Icosahedron subdivision face requires at least three vertices")
        const ab = midpointIndex(a, b)
        const bc = midpointIndex(b, c)
        const ca = midpointIndex(c, a)

        nextFaces.push([a, ab, ca])
        nextFaces.push([b, bc, ab])
        nextFaces.push([c, ca, bc])
        nextFaces.push([ab, bc, ca])
      }

      faces = nextFaces
    }

    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const normals = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []

    for (const vertex of vertices) {
      const normal = vertex.clone().normalize()
      const position = normal.clone().multiplyScalar(this.radius)
      const uv = sphericalUV(normal)

      positions.push(position.x, position.y, position.z)
      normals.push(normal.x, normal.y, normal.z)
      uvs.push(uv.x, uv.y)
    }

    for (const face of faces) {
      const firstFaceVertex = face[0]
      const secondFaceVertex = face[1]
      const thirdFaceVertex = face[2]
      assert(firstFaceVertex, "Icosahedron face requires at least three vertices")
      assert(secondFaceVertex, "Icosahedron face requires at least three vertices")
      assert(thirdFaceVertex, "Icosahedron face requires at least three vertices")
      indices.push(
        firstFaceVertex,
        secondFaceVertex,
        thirdFaceVertex
      )
    }

    return createMeshFromArrays({
      positions,
      normals,
      uvs,
      indices
    })
  }
}
