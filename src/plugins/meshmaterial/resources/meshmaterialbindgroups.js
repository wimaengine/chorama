/** @import { RawMaterial } from "../../../material/index.js" */
/** @import { WebGLBindGroup } from "../../../core/index.js" */
/** @import { WebGLBindGroupLayout } from "../../../core/layouts/bindgroup.js" */

export class MeshMaterialBindGroups {
  /** @type {Map<RawMaterial, WebGLBindGroup>} */
  #bindGroups = new Map()
  /** @type {Map<RawMaterial, WebGLBindGroupLayout>} */
  #bindGroupLayouts = new Map()

  clear() {
    this.#bindGroups.clear()
    this.#bindGroupLayouts.clear()
  }

  /**
   * @param {RawMaterial} material
   * @returns {WebGLBindGroup | undefined}
   */
  get(material) {
    return this.#bindGroups.get(material)
  }

  /**
   * @param {RawMaterial} material
   * @returns {WebGLBindGroupLayout | undefined}
   */
  getLayout(material) {
    return this.#bindGroupLayouts.get(material)
  }

  /**
   * @param {RawMaterial} material
   * @param {WebGLBindGroup} bindGroup
   * @param {WebGLBindGroupLayout} layout
   */
  set(material, bindGroup, layout) {
    this.#bindGroups.set(material, bindGroup)
    this.#bindGroupLayouts.set(material, layout)
  }

}
