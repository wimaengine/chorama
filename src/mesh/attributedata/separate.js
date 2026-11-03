import { Affine3, Vector3 } from "../../math/index.js"
import { copyBuffer } from "../../utils/index.js"
import { Attribute } from "../attribute/index.js"

export class SeparateAttributeData {
  /**
   * Internal storage for attribute data.
   * @type {Map<string, DataView>}
   * */
  #data = new Map()

  /**
   * Tracks if the attribute data has changed since last checked.
   * @type {boolean}
   * */
  #changed = false

  /**
   * @package
   * @returns {boolean}
   * Indicates if the data has changed since last queried.
   * Automatically resets the flag.
   */
  get changed() {
    const wasChanged = this.#changed
    this.#changed = false
    return wasChanged
  }

  /**
   * Sets an attribute data entry.
   * @param {string} name
   * @param {DataView<ArrayBufferLike>} data
   * @returns {this}
   */
  set(name, data) {
    this.#data.set(name, data)
    this.#changed = true
    return this
  }

  /**
   * Retrieves an attribute data entry.
   * @param {string} name
   * @returns {DataView | undefined}
   */
  get(name) {
    return this.#data.get(name)
  }

  /**
   * Checks if an attribute exists.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.#data.has(name)
  }

  /**
   * Deletes an attribute by name.
   * @param {string} name
   * @returns {boolean}
   */
  delete(name) {
    const result = this.#data.delete(name)
    if (result) this.#changed = true
    return result
  }

  /**
   * Clears all attribute data.
   * @returns {this}
   */
  clear() {
    if (this.#data.size > 0) {
      this.#data.clear()
      this.#changed = true
    }
    return this
  }

  keys(){
    return this.#data.keys()
  }

  values(){
    return this.#data.values()
  }

  entries(){
    this.#data.entries()
  }

  /**
   * Merges this attribute data with another instance.
   * @param {SeparateAttributeData} other
   * @returns {SeparateAttributeData}
   */
  merge(other) {
    const newAttributes = new SeparateAttributeData()

    for (const [id, data] of this.#data) {
      const otherData = other.get(id)
      if (!otherData) continue

      const newData = new ArrayBuffer(otherData.byteLength + data.byteLength)
      copyBuffer(data.buffer, newData, 0, data.byteLength)
      copyBuffer(otherData.buffer, newData, data.byteLength, otherData.byteLength)

      newAttributes.set(id, new DataView(newData))
    }

    if (newAttributes.#data.size > 0) {
      newAttributes.#changed = true
    }

    return newAttributes
  }

  /**
   * Transforms 3D attribute data using an affine transformation.
   * @param {Affine3} affine
   */
  transform3d(affine) {
    const positions = this.get(Attribute.Position3D.name)
    const normals = this.get(Attribute.Normal.name)
    const tangents = this.get(Attribute.Tangent.name)

    if (positions) {
      const trPositions = new Float32Array(positions.buffer, positions.byteOffset, positions.byteLength / Float32Array.BYTES_PER_ELEMENT)
      for (let i = 0; i < trPositions.length; i += 3) {
        const position = new Vector3(
          trPositions[i],
          trPositions[i + 1],
          trPositions[i + 2],
        )
        affine.transform(position)
        trPositions[i] = position.x
        trPositions[i + 1] = position.y
        trPositions[i + 2] = position.z
      }
      this.#changed = true
    }

    if (normals) {
      const floats = new Float32Array(normals.buffer, normals.byteOffset, normals.byteLength / Float32Array.BYTES_PER_ELEMENT)
      for (let i = 0; i < floats.length; i += 3) {
        const normal = new Vector3(
          floats[i],
          floats[i + 1],
          floats[i + 2],
        )
        affine.transformWithoutTranslation(normal)
        floats[i] = normal.x
        floats[i + 1] = normal.y
        floats[i + 2] = normal.z
      }
      this.#changed = true
    }

    if (tangents) {
      const floats = new Float32Array(tangents.buffer, tangents.byteOffset, tangents.byteLength / Float32Array.BYTES_PER_ELEMENT)
      for (let i = 0; i < floats.length; i += 4) {
        const tangent = new Vector3(
          floats[i],
          floats[i + 1],
          floats[i + 2],
        )
        affine.transformWithoutTranslation(tangent)
        floats[i] = tangent.x
        floats[i + 1] = tangent.y
        floats[i + 2] = tangent.z
      }
      this.#changed = true
    }

    return this
  }
}
