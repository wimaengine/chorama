import { Attribute } from "../attribute/index.js"
import { SeparateAttributeData } from "../attributedata/index.js"
import { Vector2, Vector3 } from "../../math/index.js"
import { Mesh } from "../mesh.js"
import { assert } from "../../utils/index.js"

/**
 * Creates a mesh from flat attribute arrays.
 *
 * @param {object} options
 * @param {number[]} options.positions
 * @param {number[]} [options.normals]
 * @param {number[]} [options.uvs]
 * @param {number[]} [options.indices]
 * @returns {Mesh}
 */
export function createMeshFromArrays({
  positions,
  normals = [],
  uvs = [],
  indices
}) {
  const attributes = new SeparateAttributeData()

  if (positions.length > 0) {
    attributes.set(
      Attribute.Position.name,
      new DataView(new Float32Array(positions).buffer)
    )
  }

  if (normals.length > 0) {
    attributes.set(
      Attribute.Normal.name,
      new DataView(new Float32Array(normals).buffer)
    )
  }

  if (uvs.length > 0) {
    attributes.set(
      Attribute.UV.name,
      new DataView(new Float32Array(uvs).buffer)
    )
  }

  const mesh = new Mesh(attributes)
  if (indices && indices.length > 0) {
    mesh.indices = createIndexArray(indices, positions.length / 3)
  }

  return mesh
}

/**
 * Chooses an index buffer type that can hold the supplied vertex count.
 *
 * @param {number[]} indices
 * @param {number} vertexCount
 * @returns {Uint16Array | Uint32Array}
 */
export function createIndexArray(indices, vertexCount) {
  if (vertexCount > 65535) {
    return new Uint32Array(indices)
  }

  return new Uint16Array(indices)
}

/**
 * Returns spherical UV coordinates for a position on a unit sphere.
 *
 * @param {Vector3} position
 * @returns {Vector2}
 */
export function sphericalUV(position) {
  const u = 0.5 + Math.atan2(position.z, position.x) / (Math.PI * 2)
  const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, position.y))) / Math.PI
  return new Vector2(u, v)
}

/**
 * Computes the signed area of a 2D polygon.
 *
 * @param {Vector2[]} points
 * @returns {number}
 */
export function signedArea2D(points) {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    assert(a, `Missing polygon point at index ${i}`)
    const b = points[(i + 1) % points.length]
    assert(b, `Missing polygon point at index ${(i + 1) % points.length}`)
    area += a.x * b.y - b.x * a.y
  }
  return area * 0.5
}

/**
 * Generates a regular polygon in the XY plane.
 *
 * @param {number} sides
 * @param {number} radius
 * @param {number} [rotation=0]
 * @param {number} [centerY=0]
 * @returns {Vector2[]}
 */
export function regularPolygonPoints(sides, radius, rotation = 0, centerY = 0) {
  const points = []
  const angleStep = (Math.PI * 2) / sides

  for (let i = 0; i < sides; i++) {
    const angle = rotation + i * angleStep
    points.push(new Vector2(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius + centerY
    ))
  }

  return points
}
