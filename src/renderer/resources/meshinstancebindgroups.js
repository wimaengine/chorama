import { UniformBuffer } from "../../core/resources/index.js"
import { snapUp } from "../../math/index.js"
import { assert, assertTrue } from "../../utils/index.js"
import { MeshInstanceUniform } from "./meshinstanceuniform.js"

/**
 * Shared per-view mesh-instance bind-group cache.
 *
 * Each view entry owns independent opaque, alphaMask, and transparent phase
 * buffers so render stages can reuse a cached bind group for their mesh data.
 */
export class MeshInstanceBindGroups {
  /**
   * Raw std140 payload size for one mesh-instance block.
   * @readonly
   * @type {number}
   */
  static MinSize = MeshInstanceUniform.BlockSize

  /**
   * @type {number}
   */
  #stride

  /**
   * @type {WeakMap<object, MeshInstanceBindGroupEntry>}
   */
  #entries = new WeakMap()

  /**
   * Superset bind group layout shared by every mesh-instance phase.
   * @type {import("../../core/layouts/bindgroup.js").WebGLBindGroupLayout | undefined}
   */
  bindGroupLayout

  /**
   * @param {import("../../core/index.js").WebGLRenderDevice} renderDevice
   */
  constructor(renderDevice) {
    this.#stride = snapUp(MeshInstanceBindGroups.MinSize, renderDevice.limits.minUniformBufferOffsetAlignment)
  }

  /**
   * Returns the shared bind group layout for the current payload size.
   *
   * @param {import("../../core/index.js").WebGLRenderDevice} device
   * @returns {import("../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  getBindGroupLayout(device) {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = device.createBindGroupLayout({
        label: "MeshInstanceBindGroupsLayout",
        entries: [
          {
            binding: 0,
            name: "MeshInstanceBlock",
            visibility: 0,
            buffer: {
              type: "uniform",
              hasDynamicOffset: true,
              minBindingSize: MeshInstanceBindGroups.MinSize
            }
          }
        ]
      })
    }

    assert(this.bindGroupLayout, "MeshInstance bind group layout missing")
    return this.bindGroupLayout
  }

  /**
   * Returns the cached per-view entry for an object, creating it if needed.
   *
   * @param {object} object
   * @returns {MeshInstanceBindGroupEntry}
   */
  getOrSet(object) {
    const existing = this.#entries.get(object)

    if (existing) {
      return existing
    }

    const entry = new MeshInstanceBindGroupEntry(this.#stride)
    this.#entries.set(object, entry)
    return entry
  }
}

/**
 * Cached mesh-instance state for a single view object.
 */
export class MeshInstanceBindGroupEntry {
  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  opaque

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  alphaMask

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  transparent

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.opaque = new MeshInstancePhaseBindGroup(stride)
    this.alphaMask = new MeshInstancePhaseBindGroup(stride)
    this.transparent = new MeshInstancePhaseBindGroup(stride)
  }

}

/**
 * Phase-local mesh-instance payload cache.
 */
export class MeshInstancePhaseBindGroup {
  /**
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer()

  /**
   * @type {number}
   */
  #stride

  /**
   * @type {number}
   */
  #nextOffset = 0

  /**
   * @type {WeakMap<MeshInstanceUniform, MeshInstanceSlot>}
   */
  #slots = new WeakMap()

  /**
   * @type {import("../../core/index.js").GPUBuffer | undefined}
   */
  #gpuBuffer

  /**
   * @type {import("../../core/index.js").WebGLBindGroup | undefined}
   */
  bindGroup

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.#stride = stride
  }

  /**
   * Clears all slot allocations so the next frame starts from offset 0.
   */
  reset() {
    this.#slots = new WeakMap()
    this.#nextOffset = 0
  }

  /**
   * Ensures the phase buffer can hold the requested number of slots.
   *
   * @param {number} instanceCount
   */
  reserve(instanceCount) {
    assertTrue(Number.isInteger(instanceCount) && instanceCount >= 0, `Invalid mesh instance count ${instanceCount}`)

    const requiredSize = Math.max(this.#nextOffset, instanceCount * this.#stride)

    if (requiredSize <= this.buffer.data.byteLength) {
      return
    }

    const next = new ArrayBuffer(requiredSize)
    new Uint8Array(next).set(new Uint8Array(this.buffer.data))
    this.buffer.data = next
  }

  /**
   * Returns the stable slot for the supplied mesh instance, allocating it if needed.
   *
   * @param {MeshInstanceUniform} meshInstance
   * @returns {MeshInstanceSlot}
   */
  getOrAllocate(meshInstance) {
    const existing = this.#slots.get(meshInstance)

    if (existing) {
      return existing
    }

    const slot = {
      offset: this.#nextOffset
    }

    this.#nextOffset += this.#stride
    this.#slots.set(meshInstance, slot)
    return slot
  }

  /**
   * Writes a payload into the stable slot for the supplied mesh instance.
   *
   * @param {MeshInstanceUniform} meshInstance
   * @param {ArrayBuffer} data
   * @returns {MeshInstanceSlot}
   */
  setData(meshInstance, data) {
    const slot = this.getOrAllocate(meshInstance)

    assertTrue(data.byteLength <= this.#stride, `Mesh instance payload exceeds the aligned slot size`)

    const bufferData = this.buffer.data
    assertTrue(
      slot.offset + this.#stride <= bufferData.byteLength,
      "MeshInstanceBindGroups capacity exceeded; call reserve() before creating bind groups"
    )

    const slotBytes = new Uint8Array(bufferData, slot.offset, this.#stride)

    slotBytes.fill(0)
    slotBytes.set(new Uint8Array(data))
    this.buffer.data = bufferData
    return slot
  }

  /**
   * Returns a cached bind group for this phase, recreating it when the
   * underlying GPU buffer changes.
   *
   * @param {import("../../core/index.js").WebGLRenderDevice} device
   * @param {import("../../caches/index.js").Caches} caches
   * @param {import("../../core/layouts/bindgroup.js").WebGLBindGroupLayout} layout
   * @returns {import("../../core/index.js").WebGLBindGroup}
   */
  getBindGroup(device, caches, layout) {
    const gpuBuffer = caches.getUniformBuffer(device, this.buffer)

    if (this.bindGroup && this.#gpuBuffer === gpuBuffer) {
      return this.bindGroup
    }

    this.#gpuBuffer = gpuBuffer
    this.bindGroup = device.createBindGroup({
      label: "MeshInstanceBindGroup",
      layout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: gpuBuffer,
            size: this.#stride
          }
        }
      ]
    })

    return this.bindGroup
  }
}

/**
 * @typedef {object} MeshInstanceSlot
 * @property {number} offset
 */

/**
 * @typedef {object} RenderItemBindGroupState
 * @property {number} index
 * @property {import("../../core/index.js").WebGLBindGroup} bindGroup
 * @property {ReadonlyArray<number>} dynamicOffsets
 */
