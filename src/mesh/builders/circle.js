import { Attribute } from "../attribute/index.js"
import { SeparateAttributeData } from "../attributedata/index.js"
import { Mesh } from "../mesh.js"
import { MeshBuilder } from "./base.js"

export class Circle3DMeshBuilder extends MeshBuilder {
  radius = 0.5
  segments = 32
  arcStart = 0
  arcLength = Math.PI * 2
  /**
   * @override
   */
  build() {
    const { radius, arcStart: arcstart, arcLength: arclength, segments} = this
    const vertices = [0, 0, 0]
    const normals = [0, 0, 1]
    const uvs = [0.5, 0.5]
    const indices = []
    const angleIncrement = arclength / segments
    const epilson = Math.pow(2, -31)

    for (let angle = arcstart; angle < arcstart + arclength + epilson; angle += angleIncrement) {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      vertices.push(
        radius * cos,
        radius * sin,
        0
      )
      normals.push(
        0, 0, 1
      )
      uvs.push(
        (cos + 1) * 0.5, (sin + 1) * 0.5,
      )
    }
    for (let i = 2; i < vertices.length / 3; i++) {
      indices.push(i - 1, i, 0)
    }

    const attributes = new SeparateAttributeData()

    attributes
      .set(
        Attribute.Position3D.name,
        new DataView(new Float32Array(vertices).buffer)
      )
      .set(
        Attribute.Normal.name,
        new DataView(new Float32Array(normals).buffer)
      )
      .set(
        Attribute.UV.name,
        new DataView(new Float32Array(uvs).buffer)
      )
    const mesh = new Mesh(attributes)
    mesh.indices = new Uint16Array(indices)

    return mesh
  }
}
