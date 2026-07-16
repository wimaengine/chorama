// @ts-check
import { Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshBuilder } from "./base.js"
import { PolyhedronMeshBuilder } from "./polyhedron.js"
import { faceNormal } from "./utils.js"

const baseIcosahedronVertices = [
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

const baseIcosahedronFaces = [
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

const dodecahedronVertices = baseIcosahedronFaces.map((face, faceIndex) => {
  const center = new Vector3()
  for (const index of face) {
    const vertex = baseIcosahedronVertices[index]
    assert(vertex, `Missing icosahedron vertex at index ${index} for face ${faceIndex}`)
    center.add(vertex)
  }
  return center.normalize()
})

const dodecahedronFaces = baseIcosahedronVertices.map((vertex, vertexIndex) => {
  /** @type {number[]} */
  const incidentFaces = []
  for (let faceIndex = 0; faceIndex < baseIcosahedronFaces.length; faceIndex++) {
    const sourceFace = baseIcosahedronFaces[faceIndex]
    assert(sourceFace, `Missing icosahedron face at index ${faceIndex}`)
    if (sourceFace.includes(vertexIndex)) {
      incidentFaces.push(faceIndex)
    }
  }

  const normal = vertex.clone().normalize()
  const helper = Math.abs(normal.x) < 0.9
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 1, 0)
  const tangent = helper.clone().cross(normal).normalize()
  const bitangent = normal.clone().cross(tangent).normalize()

  const center = new Vector3()
  for (const faceIndex of incidentFaces) {
    const faceVertex = dodecahedronVertices[faceIndex]
    assert(faceVertex, `Missing dodecahedron vertex at index ${faceIndex}`)
    center.add(faceVertex)
  }
  center.divideScalar(incidentFaces.length)

  incidentFaces.sort((a, b) => {
    const vertexA = dodecahedronVertices[a]
    const vertexB = dodecahedronVertices[b]
    assert(vertexA, `Missing dodecahedron vertex at index ${a}`)
    assert(vertexB, `Missing dodecahedron vertex at index ${b}`)
    const pointA = vertexA.clone().subtract(center)
    const pointB = vertexB.clone().subtract(center)
    const angleA = Math.atan2(pointA.dot(bitangent), pointA.dot(tangent))
    const angleB = Math.atan2(pointB.dot(bitangent), pointB.dot(tangent))
    return angleA - angleB
  })

  const orderedVertices = incidentFaces.map((faceIndex) => {
    const faceVertex = dodecahedronVertices[faceIndex]
    assert(faceVertex, `Missing dodecahedron vertex at index ${faceIndex}`)
    return faceVertex
  })
  const firstOrderedVertex = orderedVertices[0]
  const secondOrderedVertex = orderedVertices[1]
  const thirdOrderedVertex = orderedVertices[2]
  assert(firstOrderedVertex, "Dodecahedron face requires at least three vertices")
  assert(secondOrderedVertex, "Dodecahedron face requires at least three vertices")
  assert(thirdOrderedVertex, "Dodecahedron face requires at least three vertices")

  if (faceNormal(firstOrderedVertex, secondOrderedVertex, thirdOrderedVertex).dot(center) < 0) {
    incidentFaces.reverse()
  }

  return incidentFaces
})

export class DodecahedronMeshBuilder extends MeshBuilder {
  radius = 0.5

  /**
   * @type {Set<number>}
   */
  excludeFaces = new Set()

  /** @override */
  build() {
    const builder = new PolyhedronMeshBuilder()
    builder.vertices = dodecahedronVertices
    builder.faces = dodecahedronFaces
    builder.excludeFaces = this.excludeFaces
    builder.radius = this.radius
    return builder.build()
  }
}
