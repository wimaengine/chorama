// @ts-check
import { Vector2, Vector3 } from "../../math/index.js"
import { Mesh } from "../mesh.js"

/**
 * @typedef {{
 *   min: Vector2,
 *   max: Vector2
 * }} Bounds2D
 */

/**
 * @param {Mesh[]} meshes
 */
export function mergeMeshes(meshes) {
  let result = meshes[0]

  if (!result) {
    return
  }

  for (let i = 1; i < meshes.length; i++) {
    const nextMesh = /** @type {Mesh} */ (meshes[i])

    result = result.merge(nextMesh)
  }

  return result
}

/**
 * @param {Vector2[]} points
 * @returns {Bounds2D}
 */
export function getBounds(points) {
  const min = new Vector2(Infinity, Infinity)
  const max = new Vector2(-Infinity, -Infinity)

  for (const point of points) {
    if (point.x < min.x) min.x = point.x
    if (point.y < min.y) min.y = point.y
    if (point.x > max.x) max.x = point.x
    if (point.y > max.y) max.y = point.y
  }

  return { min, max }
}

/**
 * @param {Vector2} point
 * @param {Bounds2D} bounds
 * @returns {Vector2}
 */
export function projectUV(point, bounds) {
  const width = bounds.max.x - bounds.min.x || 1
  const height = bounds.max.y - bounds.min.y || 1
  return new Vector2(
    (point.x - bounds.min.x) / width,
    (point.y - bounds.min.y) / height
  )
}

/**
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @returns {Vector3}
 */
export function faceNormal(a, b, c) {
  return b.clone().subtract(a).cross(c.clone().subtract(a)).normalize()
}

/**
 * @param {number[]} positions
 * @param {number[]} normals
 * @param {number[]} uvs
 * @param {number[]} indices
 * @param {Vector3} position
 * @param {Vector3} normal
 * @param {Vector2} uv
 */
export function pushVertex(positions, normals, uvs, indices, position, normal, uv) {
  positions.push(position.x, position.y, position.z)
  normals.push(normal.x, normal.y, normal.z)
  uvs.push(uv.x, uv.y)
  indices.push(indices.length)
}

/**
 * @param {number[]} positions
 * @param {number[]} normals
 * @param {number[]} uvs
 * @param {number[]} indices
 * @param {Vector3} a
 * @param {Vector3} b
 * @param {Vector3} c
 * @param {Vector3} normal
 * @param {Vector2} uvA
 * @param {Vector2} uvB
 * @param {Vector2} uvC
 */
export function pushTriangle(positions, normals, uvs, indices, a, b, c, normal, uvA, uvB, uvC) {
  pushVertex(positions, normals, uvs, indices, a, normal, uvA)
  pushVertex(positions, normals, uvs, indices, b, normal, uvB)
  pushVertex(positions, normals, uvs, indices, c, normal, uvC)
}

/**
 * @param {Vector3[]} vertices
 * @param {Vector3} normal
 * @returns {Vector2[]}
 */
export function projectFaceUVs(vertices, normal) {
  const center = new Vector3()
  for (const vertex of vertices) {
    center.add(vertex)
  }
  center.divideScalar(vertices.length)

  const helper = Math.abs(normal.x) < 0.9
    ? new Vector3(1, 0, 0)
    : new Vector3(0, 1, 0)
  const tangent = helper.clone().cross(normal).normalize()
  const bitangent = normal.clone().cross(tangent).normalize()

  const projected = vertices.map((vertex) => {
    const offset = vertex.clone().subtract(center)
    return new Vector2(offset.dot(tangent), offset.dot(bitangent))
  })

  const min = new Vector2(Infinity, Infinity)
  const max = new Vector2(-Infinity, -Infinity)

  for (const point of projected) {
    if (point.x < min.x) min.x = point.x
    if (point.y < min.y) min.y = point.y
    if (point.x > max.x) max.x = point.x
    if (point.y > max.y) max.y = point.y
  }

  const width = max.x - min.x || 1
  const height = max.y - min.y || 1

  return projected.map((point) => new Vector2(
    (point.x - min.x) / width,
    (point.y - min.y) / height
  ))
}
