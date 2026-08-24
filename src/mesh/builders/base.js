import { abstractClass, abstractMethod } from "../../utils/index.js"
import { Mesh } from "../mesh.js"

/**
 * @abstract
 */
export class MeshBuilder {
  attributes = new MeshBuilderVertexAttributes()

  constructor() {
    abstractClass(this, MeshBuilder)
  }
  /**
   * @returns {Mesh}
   */
  build() {
    abstractMethod(this, MeshBuilder, MeshBuilder.prototype.build.name)
  }
}

export class MeshBuilderVertexAttributes {
  /**
   * @type {boolean}
   */
  position = true

  /**
   * @type {boolean}
   */
  uvs = true

  /**
   * @type {boolean}
   */
  normals = true

  /**
   * @type {boolean}
   */
  tangents = false
}
