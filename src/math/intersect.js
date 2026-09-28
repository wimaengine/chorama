import { BoundingBox3D, BoundingSphere } from "maumbo"
import { Vector3 } from "hisabati"

/**
 * @param {import('./frustum.js').Plane} halfspace
 * @param {Vector3} center
 * @param {number} radius
 */
export function containsHalfspaceSphere(halfspace, center, radius) {
  return halfspace.distanceToPoint(center) >= -radius
}

/**
 * @param {import('./frustum.js').Plane} halfspace
 * @param {Vector3} min
 * @param {Vector3} max
 * @param {import('hisabati').Affine3} transform
 */
export function containsHalfspaceAABB(halfspace, min, max, transform) {
  // Select the local corner furthest in the plane-normal direction.
  // This is the support point of the transformed AABB; selecting by the
  // world normal directly would be incorrect after rotation.
  const localXDirection = halfspace.normal.x * transform.a + halfspace.normal.y * transform.b + halfspace.normal.z * transform.c
  const localYDirection = halfspace.normal.x * transform.d + halfspace.normal.y * transform.e + halfspace.normal.z * transform.f
  const localZDirection = halfspace.normal.x * transform.g + halfspace.normal.y * transform.h + halfspace.normal.z * transform.i
  const x = localXDirection >= 0 ? max.x : min.x
  const y = localYDirection >= 0 ? max.y : min.y
  const z = localZDirection >= 0 ? max.z : min.z
  const worldX = transform.a * x + transform.d * y + transform.g * z + transform.x
  const worldY = transform.b * x + transform.e * y + transform.h * z + transform.y
  const worldZ = transform.c * x + transform.f * y + transform.i * z + transform.z
  return halfspace.normal.x * worldX + halfspace.normal.y * worldY + halfspace.normal.z * worldZ + halfspace.distance >= 0
}

/**
 * @param {import('./frustum.js').Frustum} frustum
 * @param {import('maumbo').BoundingBox3D | import('maumbo').BoundingSphere} bounds
 * @param {import('hisabati').Affine3} transform
 */
export function containsFrustum(frustum, bounds, transform) {
  const halfspaces = frustum.planes

  if (bounds instanceof BoundingSphere) {
    const local = bounds
    const center = new Vector3(
      transform.a * local.position.x + transform.d * local.position.y + transform.g * local.position.z + transform.x,
      transform.b * local.position.x + transform.e * local.position.y + transform.h * local.position.z + transform.y,
      transform.c * local.position.x + transform.f * local.position.y + transform.i * local.position.z + transform.z
    )
    const scale = Math.max(
      Math.hypot(transform.a, transform.b, transform.c),
      Math.hypot(transform.d, transform.e, transform.f),
      Math.hypot(transform.g, transform.h, transform.i)
    )
    for (const halfspace of halfspaces) {
      if (!containsHalfspaceSphere(halfspace, center, local.radius * scale)) return false
    }
  } else if (bounds instanceof BoundingBox3D) {
    for (const halfspace of halfspaces) {
      if (!containsHalfspaceAABB(halfspace, bounds.min, bounds.max, transform)) return false
    }
  }

  return true
}
