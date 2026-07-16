// @ts-check
import { Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"
import { faceNormal, projectFaceUVs, pushTriangle } from "./utils.js"

/**
 * Shared builder for polyhedron meshes.
 * Assign vertices, faces, and optional excluded face indices before calling build.
 */
export class PolyhedronMeshBuilder extends MeshBuilder {
  /**
   * @type {import("../../math/index.js").Vector3[]}
   */
  vertices = []

  /**
   * @type {number[][]}
   */
  faces = []

  /**
   * Face indices to exclude from the final mesh.
   * @type {Set<number>}
   */
  excludeFaces = new Set()

  radius = 0.5

  /** @override */
  build() {
    const scaledVertices = this.vertices.map((vertex) =>
      vertex.clone().normalize().multiplyScalar(this.radius)
    )
    const includedFaces = this.faces.filter((_, faceIndex) =>
      !this.excludeFaces.has(faceIndex)
    )
    /** @type {number[]} */
    const positions = []
    /** @type {number[]} */
    const normals = []
    /** @type {number[]} */
    const uvs = []
    /** @type {number[]} */
    const indices = []

    for (const face of includedFaces) {
      if (face.length < 3) {
        continue
      }

      const faceVertices = face.map((index) => {
        const sourceVertex = scaledVertices[index]
        assert(sourceVertex, `Missing polyhedron vertex at index ${index}`)
        return sourceVertex.clone()
      })

      const faceCenter = new Vector3()
      for (const vertex of faceVertices) {
        faceCenter.add(vertex)
      }
      faceCenter.divideScalar(faceVertices.length)

      let firstVertex = faceVertices[0]
      let secondVertex = faceVertices[1]
      let thirdVertex = faceVertices[2]
      assert(firstVertex, "Polyhedron face requires at least three vertices")
      assert(secondVertex, "Polyhedron face requires at least three vertices")
      assert(thirdVertex, "Polyhedron face requires at least three vertices")

      let normal = faceNormal(firstVertex, secondVertex, thirdVertex)
      if (normal.dot(faceCenter) < 0) {
        faceVertices.reverse()
        firstVertex = faceVertices[0]
        secondVertex = faceVertices[1]
        thirdVertex = faceVertices[2]
        assert(firstVertex, "Polyhedron face requires at least three vertices")
        assert(secondVertex, "Polyhedron face requires at least three vertices")
        assert(thirdVertex, "Polyhedron face requires at least three vertices")
        normal = faceNormal(firstVertex, secondVertex, thirdVertex)
      }

      const faceUvs = projectFaceUVs(faceVertices, normal)

      for (let i = 1; i < faceVertices.length - 1; i++) {
        const currentVertex = faceVertices[i]
        const nextVertex = faceVertices[i + 1]
        const firstUv = faceUvs[0]
        const currentUv = faceUvs[i]
        const nextUv = faceUvs[i + 1]
        assert(currentVertex, `Missing polyhedron face vertex at index ${i}`)
        assert(nextVertex, `Missing polyhedron face vertex at index ${i + 1}`)
        assert(firstUv, "Polyhedron face requires at least three UV coordinates")
        assert(currentUv, `Missing polyhedron face UV at index ${i}`)
        assert(nextUv, `Missing polyhedron face UV at index ${i + 1}`)

        pushTriangle(
          positions,
          normals,
          uvs,
          indices,
          firstVertex,
          currentVertex,
          nextVertex,
          normal,
          firstUv,
          currentUv,
          nextUv
        )
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
