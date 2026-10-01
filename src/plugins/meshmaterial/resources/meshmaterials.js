/** @import { RawMaterial } from "../../../material/index.js" */
export class MeshMaterials {
  /** @type {Set<RawMaterial>} */
  materials = new Set()

  clear() {
    this.materials.clear()
  }

  /** @param {RawMaterial} material */
  add(material) {
    this.materials.add(material)
  }
}
