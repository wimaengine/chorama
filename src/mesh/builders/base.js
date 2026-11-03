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
  build3d() {
    abstractMethod(this, MeshBuilder, MeshBuilder.prototype.build3d)
  }

  /**
   * @returns {Mesh}
   */
  build2d() {
    abstractMethod(this, MeshBuilder, MeshBuilder.prototype.build2d)
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
