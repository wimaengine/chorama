import { Affine3, Quaternion, Vector3 } from "../../math/index.js"
import { SeparateAttributeData } from "../attributedata/index.js"
import { Mesh } from "../mesh.js"
import { PlaneMeshBuilder } from "./plane.js"
import { MeshBuilder } from "./base.js"
import { mergeMeshes } from "./utils.js"

export class CuboidMeshBuilder extends MeshBuilder {
  /**
   * @type {number}
   */
  width = 1
  /**
   * @type {number}
   */
  height = 1
  /**
   * @type {number}
   */
  depth = 1
  /**
   * @type {number}
   */
  widthSegments = 1
  /**
   * @type {number}
   */
  heightSegments = 1
  /**
   * @type {number}
   */
  depthSegments = 1
  /**
   * @type {CuboidOpenFaces}
   */
  openFaces = new CuboidOpenFaces()

  /**
   * @override
   */
  build3d() {
    const halfWidth = this.width / 2
    const halfHeight = this.height / 2
    const halfDepth = this.depth / 2

    const sideBuilder = new PlaneMeshBuilder()
    const affine = new Affine3()
    let meshes = []

    sideBuilder.width = this.width
    sideBuilder.height = this.height
    sideBuilder.widthSegments = this.widthSegments
    sideBuilder.heightSegments = this.heightSegments

    if (!this.openFaces.front) {
      affine.compose(
        new Vector3(0, 0, halfDepth),
        Quaternion.Identity,
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }

    if (!this.openFaces.back) {
      affine.compose(
        new Vector3(0, 0, -halfDepth),
        Quaternion.fromEuler(0, Math.PI, 0),
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }

    sideBuilder.width = this.depth
    sideBuilder.height = this.height
    sideBuilder.widthSegments = this.depthSegments
    sideBuilder.heightSegments = this.heightSegments

    if (!this.openFaces.left) {
      affine.compose(
        new Vector3(-halfWidth, 0, 0),
        Quaternion.fromEuler(0, -Math.PI / 2, 0),
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }

    if (!this.openFaces.right) {
      affine.compose(
        new Vector3(halfWidth, 0, 0),
        Quaternion.fromEuler(0, Math.PI / 2, 0),
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }

    sideBuilder.width = this.width
    sideBuilder.height = this.depth
    sideBuilder.widthSegments = this.depthSegments
    sideBuilder.heightSegments = this.depthSegments

    if (!this.openFaces.top) {
      affine.compose(
        new Vector3(0, halfHeight, 0),
        Quaternion.fromEuler(-Math.PI / 2, 0, 0),
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }

    if (!this.openFaces.bottom) {
      affine.compose(
        new Vector3(0, -halfHeight, 0),
        Quaternion.fromEuler(Math.PI / 2, 0, 0),
        new Vector3(1, 1, 1)
      )

      meshes.push(sideBuilder.build3d().transform(affine))
    }
    return mergeMeshes(meshes) || new Mesh(new SeparateAttributeData())
  }
}

export class CuboidOpenFaces {
  top = false
  bottom = false
  left = false
  right = false
  front = false
  back = false
}