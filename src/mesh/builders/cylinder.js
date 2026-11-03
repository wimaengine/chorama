import { Affine3, Quaternion, Vector3 } from "../../math/index.js"
import { Attribute } from "../attribute/index.js"
import { SeparateAttributeData } from "../attributedata/index.js"
import { Mesh } from "../mesh.js"
import { Circle3DMeshBuilder } from "./circle.js"
import { mergeMeshes } from "./utils.js"

export class CylinderMeshBuilder {
  radiusTop = 0.5
  radiusBottom = 0.5
  height = 1
  radialSegments = 32
  heightSegments = 1
  arcStart = 0
  arcLength = Math.PI * 2
  /**
   * @type {CylinderOpenEnds}
   */
  openEnds = {
    top: false,
    bottom: false
  }

  build3d() {
    const halfHeight = this.height / 2
    const capBuilder = new Circle3DMeshBuilder()
    const transform = new Affine3()
    const torso = generateTorso.call(this)
    const meshes = [torso]

    capBuilder.segments = this.radialSegments
    capBuilder.arcStart = this.arcStart
    capBuilder.arcLength = this.arcLength

    if (!this.openEnds.top) {
      transform.compose(
        new Vector3(0, halfHeight, 0),
        Quaternion.fromEuler(-Math.PI / 2, 0, -Math.PI * 0.5),
        new Vector3(1, 1, 1)
      )
      capBuilder.radius = this.radiusTop
      meshes.push(capBuilder.build3d().transform(transform))
    }
    if (!this.openEnds.bottom) {
      transform.compose(
        new Vector3(0, -halfHeight, 0),
        Quaternion.fromEuler(-Math.PI / 2, 0, -Math.PI * 0.5),
        new Vector3(1, 1, 1)
      )
      capBuilder.radius = this.radiusBottom
      meshes.push(capBuilder.build3d().transform(transform))
    }
    return mergeMeshes(meshes) || torso
  }
}

/**
 * @this {CylinderMeshBuilder}
 * @returns {Mesh}
 */
function generateTorso() {
  const { radiusTop, radiusBottom, height, radialSegments, heightSegments, arcStart: thetaStart, arcLength: thetaLength } = this
  const indices = [];
  const positions = [];
  const normals = [];
  const uvs = [];

  const halfHeight = height / 2;
  const attributes = new SeparateAttributeData()
  const mesh = new Mesh(attributes)
  const normal = new Vector3();
  const slope = (radiusBottom - radiusTop) / height;

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const radius = v * (radiusBottom - radiusTop) + radiusTop;

    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * thetaLength + thetaStart;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      positions.push(
        radius * sinTheta,
        - v * height + halfHeight,
        radius * cosTheta
      );

      normal.set(sinTheta, slope, cosTheta).normalize();
      normals.push(normal.x, normal.y, normal.z);

      uvs.push(u, 1 - v);
    }
  }

  for (let x = 0; x < radialSegments; x++) {
    for (let y = 0; y < heightSegments; y++) {
      const a = y * (radialSegments + 1) + x
      const b = (y + 1) * (radialSegments + 1) + x
      const c = (y + 1) * (radialSegments + 1) + (x + 1)
      const d = (y) * (radialSegments + 1) + (x + 1)

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }


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
  mesh.indices = new Uint16Array(indices)
  return mesh
}

/**
 * @typedef CylinderOpenEnds
 * @property {boolean} top
 * @property {boolean} bottom
 */
