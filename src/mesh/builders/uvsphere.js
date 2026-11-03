import { Attribute } from "../attribute/index.js";
import { SeparateAttributeData } from "../attributedata/index.js";
import { Mesh } from "../mesh.js";
import { MeshBuilder } from "./base.js";

export class UVSphereMeshBuilder extends MeshBuilder {
  /**
   * @type {number}
   */
  radius = 0.5
  /**
   * @type {number}
   */
  longitudeSegments = 32
  /**
   * @type {number}
   */
  latitudeSegments = 32
  /**
   * @override
   */
  build3d() {
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= this.latitudeSegments; i++) {
      const phi = Math.PI * (-0.5 + (i / this.latitudeSegments));
      const cosphi = Math.cos(phi)
      const sinphi = Math.sin(phi)

      for (let j = 0; j <= this.longitudeSegments; j++) {
        const theta = 2 * Math.PI * (j / this.longitudeSegments);
        const costheta = Math.cos(theta)
        const sintheta = Math.sin(theta)

        const x = this.radius * costheta * cosphi
        const y = this.radius * sintheta * cosphi
        const z = this.radius * sinphi
        const nx = costheta * cosphi
        const ny = sintheta * cosphi;
        const nz = sinphi;
        const u = 1.0 - (j / this.longitudeSegments);
        const v = 1.0 - (i / this.latitudeSegments);

        vertices.push(x, y, z);
        normals.push(nx, ny, nz);
        uvs.push(u, v);
      }
    }

    for (let i = 0; i < this.latitudeSegments; i++) {
      for (let j = 0; j < this.longitudeSegments; j++) {
        const p0 = i * (this.longitudeSegments + 1) + j;
        const p1 = p0 + this.longitudeSegments + 1;
        indices.push(p0, p0 + 1, p1, p1, p0 + 1, p1 + 1);
      }
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
