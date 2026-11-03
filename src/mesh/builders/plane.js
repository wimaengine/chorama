import { Attribute } from "../attribute/attribute.js";
import { SeparateAttributeData } from "../attributedata/separate.js";
import { Mesh } from "../mesh.js";
import { MeshBuilder } from "./base.js";

export class PlaneMeshBuilder extends MeshBuilder {
  width = 1
  height = 1
  widthSegments = 1
  heightSegments = 1

  /**
   * @override
   */
  build() {
    const positions = []
    const normals = []
    const uvs = []
    const indices = []

    const widthHalf = this.width / 2;
    const heightHalf = this.height / 2;
    const gridX = this.widthSegments
    const gridY = this.heightSegments
    const gridX1 = gridX + 1;
    const gridY1 = gridY + 1;
    const segmentWidth = this.width / gridX;
    const segmentHeight = this.height / gridY

    for (let i = 0; i < gridY1; i++) {
      const dy = i * segmentHeight - heightHalf;
      for (let y = 0; y < gridX1; y++) {
        const dx = y * segmentWidth - widthHalf;

        positions.push(dx, -dy, 0);
        normals.push(0, 0, 1);
        uvs.push(y / gridX, 1 - (i / gridY));
      }
    }

    for (let x = 0; x < gridY; x++) {
      for (let y = 0; y < gridX; y++) {
        const a = y + gridX1 * x;
        const b = y + gridX1 * (x + 1);
        const c = (y + 1) + gridX1 * (x + 1);
        const d = (y + 1) + gridX1 * x;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const attributes = new SeparateAttributeData()

    attributes
      .set(
        Attribute.Position3D.name,
        new DataView(new Float32Array(positions).buffer)
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

