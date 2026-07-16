// @ts-check
import { Quaternion, Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshBuilder } from "./base.js"
import { createMeshFromArrays } from "./geometry.js"

export class TubeMeshBuilder extends MeshBuilder {
  /**
   * Path points in world space.
   * @type {Vector3[]}
   */
  points = []
  radius = 0.1
  radialSegments = 8
  closed = false

  /** @override */
  build() {
    const points = this.points

    if (points.length < 2) {
      return createMeshFromArrays({ positions: [] })
    }

    const { normals: frameNormals, binormals } = buildTubeFrames(points, this.closed)
    const positions = []
    const normals = []
    const uvs = []
    const indices = []
    const ringCount = this.radialSegments + 1

    for (let i = 0; i < points.length; i++) {
      const point = points[i]
      assert(point, `Missing tube path point at index ${i}`)
      const normal = frameNormals[i]
      assert(normal, `Missing tube frame normal at index ${i}`)
      const binormal = binormals[i]
      assert(binormal, `Missing tube frame binormal at index ${i}`)

      for (let segment = 0; segment <= this.radialSegments; segment++) {
        const t = segment / this.radialSegments
        const angle = t * Math.PI * 2
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const offset = normal.clone().multiplyScalar(cos * this.radius)
          .add(binormal.clone().multiplyScalar(sin * this.radius))
        const position = point.clone().add(offset)
        const surfaceNormal = offset.clone().normalize()

        positions.push(position.x, position.y, position.z)
        normals.push(surfaceNormal.x, surfaceNormal.y, surfaceNormal.z)
        uvs.push(t, i / (points.length - 1))
      }
    }

    const segmentCount = this.closed ? points.length : points.length - 1

    for (let i = 0; i < segmentCount; i++) {
      const nextRow = (i + 1) % points.length
      for (let segment = 0; segment < this.radialSegments; segment++) {
        const a = i * ringCount + segment
        const b = nextRow * ringCount + segment
        const c = nextRow * ringCount + segment + 1
        const d = i * ringCount + segment + 1

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

/**
 * @typedef {{
 *   tangents: Vector3[],
 *   normals: Vector3[],
 *   binormals: Vector3[]
 * }} TubeFrames
 */

/**
 * Builds a moving frame for a path.
 *
 * @param {Vector3[]} points
 * @param {boolean} closed
 * @returns {TubeFrames}
 */
function buildTubeFrames(points, closed) {
  /** @type {Vector3[]} */
  const tangents = []
  /** @type {Vector3[]} */
  const normals = []
  /** @type {Vector3[]} */
  const binormals = []

  for (let i = 0; i < points.length; i++) {
    const previous = closed || i > 0
      ? points[(i - 1 + points.length) % points.length]
      : points[i]
    assert(
      previous,
      `Missing tube path point at index ${closed || i > 0 ? (i - 1 + points.length) % points.length : i}`
    )
    const next = closed || i < points.length - 1
      ? points[(i + 1) % points.length]
      : points[i]
    assert(
      next,
      `Missing tube path point at index ${closed || i < points.length - 1 ? (i + 1) % points.length : i}`
    )

    const tangent = next.clone().subtract(previous).normalize()
    tangents.push(tangent)
  }

  const firstTangent = tangents[0]
  assert(firstTangent, "Tube path requires at least two points")
  const firstTangentClone = firstTangent.clone()
  let helper = Math.abs(firstTangent.y) < 0.9
    ? new Vector3(0, 1, 0)
    : new Vector3(1, 0, 0)
  let normal = helper.clone().cross(firstTangentClone)

  if (normal.magnitudeSquared() < 1e-8) {
    helper = new Vector3(0, 0, 1)
    normal = helper.clone().cross(firstTangentClone)
  }

  normal.normalize()
  let binormal = firstTangentClone.clone().cross(normal).normalize()
  normal = binormal.clone().cross(firstTangentClone).normalize()

  normals.push(normal)
  binormals.push(binormal)

  for (let i = 1; i < points.length; i++) {
    const previousTangent = tangents[i - 1]
    assert(previousTangent, `Missing previous tangent at index ${i - 1}`)
    const currentTangent = tangents[i]
    assert(currentTangent, `Missing tangent at index ${i}`)
    const axis = previousTangent.clone().cross(currentTangent)
    const cosine = Math.max(-1, Math.min(1, previousTangent.dot(currentTangent)))

    if (axis.magnitudeSquared() < 1e-8) {
      if (cosine > 0.999999) {
        const previousNormal = normals[i - 1]
        assert(previousNormal, `Missing frame normal at index ${i - 1}`)
        const previousBinormal = binormals[i - 1]
        assert(previousBinormal, `Missing frame binormal at index ${i - 1}`)
        normals.push(previousNormal.clone())
        binormals.push(previousBinormal.clone())
        continue
      }

      const fallback = Math.abs(previousTangent.x) < 0.9
        ? new Vector3(1, 0, 0)
        : new Vector3(0, 1, 0)
      axis.copy(previousTangent).cross(fallback)

      if (axis.magnitudeSquared() < 1e-8) {
        axis.copy(previousTangent).cross(new Vector3(0, 0, 1))
      }

      axis.normalize()
    } else {
      axis.normalize()
    }

    const angle = Math.acos(cosine)

    if (axis.magnitudeSquared() < 1e-8) {
      const previousNormal = normals[i - 1]
      assert(previousNormal, `Missing frame normal at index ${i - 1}`)
      const previousBinormal = binormals[i - 1]
      assert(previousBinormal, `Missing frame binormal at index ${i - 1}`)
      normals.push(previousNormal.clone())
      binormals.push(previousBinormal.clone())
      continue
    }

    const rotation = Quaternion.fromAxisAngle(axis, angle)

    const previousNormal = normals[i - 1]
    assert(previousNormal, `Missing frame normal at index ${i - 1}`)
    let nextNormal = Quaternion.transformVector3(
      rotation,
      previousNormal.clone()
    )
    nextNormal.normalize()
    let nextBinormal = currentTangent.clone().cross(nextNormal).normalize()
    nextNormal = nextBinormal.clone().cross(currentTangent).normalize()

    normals.push(nextNormal)
    binormals.push(nextBinormal)
  }

  return {
    tangents,
    normals,
    binormals
  }
}
