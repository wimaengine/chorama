/** @import { RawMaterial } from "../../../material/index.js" */
/** @import { WebGLBindGroup } from "../../../core/index.js" */

export class MeshMaterialBindGroups {
  /** @type {Map<RawMaterial, WebGLBindGroup>} */
  #bindGroups = new Map()

  /**
   * @param {RawMaterial} material
   * @returns {WebGLBindGroup | undefined}
   */
  get(material) {
    return this.#bindGroups.get(material)
  }

  /**
   * @param {RawMaterial} material
   * @param {WebGLBindGroup} bindGroup
   */
  set(material, bindGroup) {
    this.#bindGroups.set(material, bindGroup)
  }

  /**
   * @param {RawMaterial} material
   * @param {() => WebGLBindGroup} compute
   * @returns {WebGLBindGroup}
   */
  getOrSetCompute(material, compute) {
    const existing = this.get(material)

    if (existing) {
      return existing
    }

    const bindGroup = compute()
    this.set(material, bindGroup)
    return bindGroup
  }
}
