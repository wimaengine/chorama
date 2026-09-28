import { PrimitiveTopology } from "../constants/index.js"
import { Attribute } from "./attribute/index.js"
import { SeparateAttributeData } from "./attributedata/separate.js"
import { Affine3, Vector3 } from "../math/index.js"
import { BoundingBox3D, BoundingSphere } from "maumbo"

/**
 * @typedef {object} MorphTarget
 * @property {DataView | undefined} [position]
 * @property {DataView | undefined} [normal]
 * @property {DataView | undefined} [tangent]
 */

export class Mesh {
  /**
   * @type {Uint16Array | Uint32Array | undefined}
   */
  #indices

  /**
   * @type {SeparateAttributeData}
   */
  #attributes

  /**
   * @type {MorphTarget[]}
   */
  #morphTargets = []

  /**
   * @type {PrimitiveTopology}
   */
  topology = PrimitiveTopology.Triangles

  /**
   * Tracks if the attribute data has changed since last checked.
   * @type {boolean}
   * */
  #changed = false

  /** @type {BoundingBox3D | import('maumbo').BoundingSphere | undefined} */
  bounds

  /**
   * @param {SeparateAttributeData} attributes
   */
  constructor(attributes) {
    this.#attributes = attributes
  }

  /**
   * @package
   * @returns {boolean}
   * Indicates if the data has changed since last queried.
   * Automatically resets the flag.
   */
  get changed() {
    const wasChanged = this.#changed
    this.#changed = false
    return wasChanged || this.attributes.changed
  }

  /**
   * @type {Uint16Array | Uint32Array | undefined}
   */
  get indices() {
    return this.#indices
  }
  set indices(value) {
    this.#indices = value
    this.#changed = true
  }

  /**
   * @type {SeparateAttributeData}
   */
  get attributes() {
    return this.#attributes
  }

  /**
   * Calculates an axis-aligned bounding box from the mesh positions.
   */
  calculateAABBBounds() {
    const positions = this.attributes.get(Attribute.Position.name)
    if (!positions || positions.byteLength < 12) return
    const values = new Float32Array(positions.buffer, positions.byteOffset, Math.floor(positions.byteLength / 4))
    const min = new Vector3(Infinity, Infinity, Infinity)
    const max = new Vector3(-Infinity, -Infinity, -Infinity)

    for (let i = 0; i + 2 < values.length; i += 3) {
      min.x = Math.min(min.x, values[i] ?? 0)
      min.y = Math.min(min.y, values[i + 1] ?? 0)
      min.z = Math.min(min.z, values[i + 2] ?? 0)
      max.x = Math.max(max.x, values[i] ?? 0)
      max.y = Math.max(max.y, values[i + 1] ?? 0)
      max.z = Math.max(max.z, values[i + 2] ?? 0)
    }

    this.bounds = new BoundingBox3D(min.x, min.y, min.z, max.x, max.y, max.z)
  }

  /**
   * Calculates a bounding sphere from the mesh positions.
   */
  calculateBoundingSphere() {
    const positions = this.attributes.get(Attribute.Position.name)
    if (!positions || positions.byteLength < 12) return
    const values = new Float32Array(positions.buffer, positions.byteOffset, Math.floor(positions.byteLength / 4))
    this.calculateAABBBounds()
    const bounds = this.bounds
    if (!(bounds instanceof BoundingBox3D)) return

    const center = new Vector3(
      (bounds.min.x + bounds.max.x) / 2,
      (bounds.min.y + bounds.max.y) / 2,
      (bounds.min.z + bounds.max.z) / 2
    )
    let radiusSquared = 0
    for (let i = 0; i + 2 < values.length; i += 3) {
      const dx = (values[i] ?? 0) - center.x
      const dy = (values[i + 1] ?? 0) - center.y
      const dz = (values[i + 2] ?? 0) - center.z
      radiusSquared = Math.max(radiusSquared, dx * dx + dy * dy + dz * dz)
    }

    this.bounds = new BoundingSphere(center.x, center.y, center.z, Math.sqrt(radiusSquared))
  }

  set attributes(value) {
    this.#attributes = value
    this.#changed = true
  }

  /**
   * @type {MorphTarget[]}
   */
  get morphTargets() {
    return this.#morphTargets
  }
  set morphTargets(value) {
    this.#morphTargets = value
    this.#changed = true
  }

  /**
   * @param {Affine3} affine
   */
  transform(affine) {
    this.attributes.transform(affine)

    for (const target of this.morphTargets) {
      transformMorphTargetAttribute(target.position, affine)
      transformMorphTargetAttribute(target.normal, affine)
      transformMorphTargetAttribute(target.tangent, affine)
    }

    return this
  }

  /**
   * @param {Mesh} other
   */
  merge(other) {
    if (this.morphTargets.length > 0 || other.morphTargets.length > 0) {
      throw "Merging meshes with morph targets is not supported"
    }

    const newAttributes = this.attributes.merge(other.attributes)
    const newMesh = new Mesh(newAttributes)

    if (this.indices && other.indices) {
      const positions = this.attributes.get(Attribute.Position.name)
      const otherPositions = other.attributes.get(Attribute.Position.name)

      if (!positions) {
        return newMesh
      }

      const attributeCount = positions.byteLength / (3 * 4)
      const otherAttributeCount = otherPositions
        ? otherPositions.byteLength / (3 * 4)
        : 0
      const offset = this.indices.length
      const IndexArray = (
        this.indices instanceof Uint32Array ||
        other.indices instanceof Uint32Array ||
        attributeCount + otherAttributeCount > 65535
      ) ? Uint32Array : Uint16Array

      const newIndices = new IndexArray(this.indices.length + other.indices.length)

      for (let i = 0; i < this.indices.length; i++) {
        const index = /**@type {number} */(this.indices[i]);

        newIndices[i] = index
      }

      for (let i = 0; i < other.indices.length; i++) {
        const index = /**@type {number} */(other.indices[i]);

        newIndices[i + offset] = index + attributeCount
      }
      newMesh.indices = newIndices
    } else if (!this.indices && !other.indices) {
      // Do nothing because attributes are already merged
    } else {
      // TODO: How do we merge an indexed and non-indexed mesh?
      throw "Invalid merge, both meshes must either have indices or not have them."
    }
    return newMesh
  }

  normalizeJointWeights() {
    const weights = this.attributes.get(Attribute.JointWeight.name)

    if (!weights) return

    const data = new Float32Array(
      weights.buffer,
      weights.byteOffset,
      weights.byteLength / Float32Array.BYTES_PER_ELEMENT
    )

    for (let i = 0; i < data.length; i += 4) {
      const sum = /**@type {number}*/(data[i]) +
        /**@type {number}*/ (data[i + 1]) +
        /**@type {number}*/ (data[i + 2]) +
        /**@type {number}*/ (data[i + 3])

      if (sum === 0) {
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
        data[i + 3] = 0
      } else {
        const inv = 1 / sum
        data[i] = /**@type {number}*/(data[i]) * inv
        data[i + 1] = /**@type {number}*/ (data[i + 1]) * inv
        data[i + 2] = /**@type {number}*/(data[i + 2]) * inv
        data[i + 3] = /**@type {number}*/(data[i + 3]) * inv
      }
    }
  }
}

/**
 * Morph target deltas are vectors, so they only receive the linear part of
 * the affine transform.
 *
 * @param {DataView | undefined} data
 * @param {Affine3} affine
 */
function transformMorphTargetAttribute(data, affine) {
  if (!data) {
    return
  }

  const floats = new Float32Array(data.buffer, data.byteOffset, data.byteLength / Float32Array.BYTES_PER_ELEMENT)

  for (let i = 0; i < floats.length; i += 3) {
    const x = floats[i] ?? 0
    const y = floats[i + 1] ?? 0
    const z = floats[i + 2] ?? 0

    floats[i] = affine.a * x + affine.d * y + affine.g * z
    floats[i + 1] = affine.b * x + affine.e * y + affine.h * z
    floats[i + 2] = affine.c * x + affine.f * y + affine.i * z
  }
}
