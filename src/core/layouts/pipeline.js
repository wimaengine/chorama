/** @import { WebGLBindGroup } from "../webgl/bindgroup.js" */
/** @import { WebGLBindGroupLayout } from "./bindgroup.js" */
import { assert } from "../../utils/index.js";

export class WebGLPipelineLayout {
  /**
   * @readonly
   * @type {string | undefined}
   */
  label

  /**
   * @package
   * @readonly
   * @type {(WebGLBindGroupLayout | undefined)[]}
   */
  bindGroupLayouts

  /**
   * @private
   * @type {number}
   */
  bindingPoint = 0

  /**
   * @private
   * @type {Map<number, Map<number, number>>}
   */
  bindGroupBufferPoints = new Map()

  /**
   * @private
   * @type {Map<string, number>}
   */
  bindingPointsByName = new Map()

  /**
   * @param {WebGLPipelineLayoutDescriptor} descriptor
   */
  constructor({ label, bindGroupLayouts }) {
    this.label = label
    this.bindGroupLayouts = [...bindGroupLayouts]

    for (let bindGroupIndex = 0; bindGroupIndex < this.bindGroupLayouts.length; bindGroupIndex++) {
      const layout = this.bindGroupLayouts[bindGroupIndex]
      assert(layout, `Pipeline layout is missing bind group layout ${bindGroupIndex}`)
      this.allocateBindGroupBufferPoints(bindGroupIndex, layout)
    }
  }

  /**
   * @param {number} index
   */
  getBindGroupLayout(index) {
    return this.bindGroupLayouts[index]
  }

  /**
   * @package
   * @param {number} bindGroupIndex
   * @param {number} binding
   * @returns {number | undefined}
   */
  getBindGroupBufferPoint(bindGroupIndex, binding) {
    return this.bindGroupBufferPoints.get(bindGroupIndex)?.get(binding)
  }

  /**
   * @private
   * @param {number} bindGroupIndex
   * @param {WebGLBindGroupLayout} layout
   */
  allocateBindGroupBufferPoints(bindGroupIndex, layout) {
    assert(layout, `Pipeline layout is missing bind group layout ${bindGroupIndex}`)

    const points = this.bindGroupBufferPoints.get(bindGroupIndex) ?? new Map()

    for (const entry of layout.entries) {
      if (entry.buffer === undefined || points.has(entry.binding)) {
        continue
      }

      points.set(entry.binding, this.reserveBindingPoint(entry.name))
    }

    this.bindGroupBufferPoints.set(bindGroupIndex, points)
  }

  /**
   * @param {string | undefined} [name]
   * @returns {number}
   */
  reserveBindingPoint(name) {
    if (name !== undefined) {
      const existing = this.bindingPointsByName.get(name)

      if (existing !== undefined) {
        return existing
      }
    }

    const point = this.bindingPoint
    this.bindingPoint += 1

    if (name !== undefined) {
      this.bindingPointsByName.set(name, point)
    }

    return point
  }

  /**
   * @param {number} index
   * @param {WebGLBindGroup} bindGroup
   */
  isBindGroupCompatible(index, bindGroup) {
    const layout = this.getBindGroupLayout(index)

    return layout ? layout.compatibleWith(bindGroup.layout) : false
  }
}

/**
 * @typedef WebGLPipelineLayoutDescriptor
 * @property {string} [label]
 * @property {WebGLBindGroupLayout[]} bindGroupLayouts
 */
