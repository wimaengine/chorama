import { assert } from "../../utils/index.js"
import { Attribute } from "../attribute/index.js"
import { PrimitiveTopology } from "../../constants/index.js"
import { Mesh } from "../mesh.js"

export class WireframeBuilder {
  mesh
  /**
   * @param {Mesh} mesh
   */
  constructor(mesh) {
    this.mesh = mesh
  }
  build() {
    const { indices, attributes } = this.mesh
    const edges = new Set()
    /**@type {number[]} */
    const lineIndices = []

    if (indices) {
      // Triangle list
      for (let i = 0; i < indices.length; i += 3) {
        const a = /**@type {number}*/ (indices[i]),
          b = /**@type {number}*/ (indices[i + 1]),
          c = /**@type {number}*/ (indices[i + 2]);
        addEdge(edges, lineIndices, a, b);
        addEdge(edges, lineIndices, b, c);
        addEdge(edges, lineIndices, c, a);
      }
    } else {
      const position = attributes.get(Attribute.Position3D.name)

      assert(position, "No position data found")
      for (let i = 0; i < position.byteLength / (4 * 3); i += 3) {
        addEdge(edges, lineIndices, i, i + 1);
        addEdge(edges, lineIndices, i + 1, i + 2);
        addEdge(edges, lineIndices, i + 2, i);
      }
    }

    const mesh = new Mesh(this.mesh.attributes)
    mesh.indices = new Uint32Array(lineIndices)
    mesh.topology = PrimitiveTopology.Lines

    return mesh
  }
}

/**
 * Adds an edge to the list, avoiding duplicates.
 * @param {Set<string>} edgeMap
 * @param {number[]} out
 * @param {number} a
 * @param {number} b
 */
function addEdge(edgeMap, out, a, b) {
  const key = a < b ? `${a}_${b}` : `${b}_${a}`;
  if (!edgeMap.has(key)) {
    edgeMap.add(key);
    out.push(a, b);
  }
}
