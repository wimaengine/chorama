import { Mesh, Attribute } from '../mesh/index.js';
import { BasicMaterial } from '../material/index.js';
import { MeshMaterial3D, Object3D } from '../objects/index.js';
import { Loader } from './loader.js';
import { arrayBufferToText } from './utils.js';
import { SeparateAttributeData } from '../mesh/attributedata/separate.js';

/**
 * @extends {Loader<Object3D, ObjLoadSettings>}
 */
export class OBJLoader extends Loader {

  /**
   * @override
   * @protected
   * @type {(destination: Object3D, source: Object3D) => void}
   */
  copyFn = (destination, source) => {
    destination.merge(source)
  }

  constructor() {
    super(Object3D)
  }

  /**
   * @override
   * @param {ArrayBuffer[]} buffers
   * @param {Object3D} destination
   * @param {ObjLoadSettings} _settings
   */
  async parse(buffers, destination, _settings) {
    const buffer = buffers[0]
    if (!buffer) {
      return
    }
    const raw = arrayBufferToText(buffer)
    const obj = await loadOBJ(raw)
    const attributes = new SeparateAttributeData()
    const position = obj.attributes.get(Attribute.Position3D.name)
    const normals = obj.attributes.get(Attribute.Normal.name)
    const uvs = obj.attributes.get(Attribute.UV.name)

    if (position) {
      attributes.set(Attribute.Position3D.name, position)
    }

    if (normals) {
      attributes.set(Attribute.Normal.name, normals)
    }

    if (uvs) {
      attributes.set(Attribute.UV.name, uvs)
    }
    const mesh = new Mesh(attributes)
    const root = new MeshMaterial3D(mesh, new BasicMaterial())

    destination.add(root)
  }

  /**
   * @override
   */
  default() {
    return new Object3D()
  }
}

/**
 * @param {string} data 
 */
async function loadOBJ(data) {
  const positions = []
  const uvs = []
  const normals = []
  const faces = []
  let includeUVs = true
  let includeNormals = true

  const lines = data.split("\n")

  for (let line of lines) {
    line = line.trim();

    // skip empty & comments
    if (line === "" || line.startsWith("#")) continue;

    const parts = line.split(/\s+/);
    const keyword = parts[0];
    const data = parts.slice(1);

    switch (keyword) {
      case "v": // vertex position
        positions.push(data.map(Number));
        break;
      case "vt": // uv
        uvs.push(data.map(Number));
        break;
      case "vn": // normal
        normals.push(data.map(Number));
        break;
      case "f": { // face
        const face = data.map(ref => {
          const [v, vt, vn] = ref
            .split("/")
            .map(x => x ? parseInt(x) : undefined);

          if (v === undefined) {
            throw new Error("OBJ faces must always reference a position index.")
          }

          return {
            v: v !== undefined ? v - 1 : undefined,   // OBJ is 1-based → shift to 0-based
            vt: vt !== undefined ? vt - 1 : undefined,
            vn: vn !== undefined ? vn - 1 : undefined
          };
        });
        includeUVs &&= face.every(vertex => vertex.vt !== undefined)
        includeNormals &&= face.every(vertex => vertex.vn !== undefined)
        faces.push(face);
        break;
      }
    }
  }

  return buildBuffers({
    positions,
    uvs,
    normals,
    triangles: faces,
    includeUVs,
    includeNormals
  })
}

/**
 * @param {{ positions: any; uvs: any; normals: any; triangles: any; includeUVs: boolean; includeNormals: boolean; }} data
 */
function buildBuffers(data) {
  const positions = [];
  const uvs = [];
  const normals = [];

  for (const triangle of data.triangles) {
    for (let i = 1; i < triangle.length - 1; i++) {
      const vertex1 = triangle[0]
      const vertex2 = triangle[i]
      const vertex3 = triangle[i + 1]

      positions.push(...data.positions[vertex1.v])
      if (data.includeNormals && vertex1.vn !== undefined) {
        normals.push(...data.normals[vertex1.vn])
      }
      if (data.includeUVs && vertex1.vt !== undefined) {
        uvs.push(...data.uvs[vertex1.vt])
      }

      positions.push(...data.positions[vertex2.v])
      if (data.includeNormals && vertex2.vn !== undefined) {
        normals.push(...data.normals[vertex2.vn])
      }
      if (data.includeUVs && vertex2.vt !== undefined) {
        uvs.push(...data.uvs[vertex2.vt])
      }

      positions.push(...data.positions[vertex3.v])
      if (data.includeNormals && vertex3.vn !== undefined) {
        normals.push(...data.normals[vertex3.vn])
      }
      if (data.includeUVs && vertex3.vt !== undefined) {
        uvs.push(...data.uvs[vertex3.vt])
      }
    }
  }

  const attributes = new Map([
    [Attribute.Position3D.name, new DataView(new Float32Array(positions).buffer)]
  ])

  if (data.includeUVs && uvs.length > 0) {
    attributes.set(Attribute.UV.name, new DataView(new Float32Array(uvs).buffer))
  }

  if (data.includeNormals && normals.length > 0) {
    attributes.set(Attribute.Normal.name, new DataView(new Float32Array(normals).buffer))
  }

  return {
    attributes,
    count: positions.length / 3
  };
}


/**
 * @typedef {import('./loader.js').LoadSettings} ObjLoadSettings
 */
