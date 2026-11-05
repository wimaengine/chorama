import { UniformBuffer } from "../../core/resources/index.js"
import { snapUp } from "../../math/index.js"
import { assert, assertTrue } from "../../utils/index.js"
import { MeshInstanceUniform } from "./meshinstanceuniform.js"

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveOpaque3DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).opaque3D.bindGroup : undefined
  )
}

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveAlphaMask3DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).alphaMask3D.bindGroup : undefined
  )
}

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveTransparent3DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).transparent3D.bindGroup : undefined
  )
}

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveOpaque2DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).opaque2D.bindGroup : undefined
  )
}

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveAlphaMask2DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).alphaMask2D.bindGroup : undefined
  )
}

/** @param {import("../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../core/index.js").View} view */
export function resolveTransparent2DBindGroup(renderer, view) {
  const object = view.object
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  return /** @type {import("../../core/index.js").WebGLBindGroup} */ (
    object ? meshInstanceBindGroups.getOrSet(object).transparent2D.bindGroup : undefined
  )
}

/**
 * Shared per-view mesh-instance bind-group cache.
 *
 * Each view entry owns independent 3D and 2D phase buffers so render stages
 * can reuse a cached bind group for their mesh data.
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
  opaque3D

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  alphaMask3D

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  transparent3D

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  opaque2D

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  alphaMask2D

  /**
   * @type {MeshInstancePhaseBindGroup}
   */
  transparent2D

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.opaque3D = new MeshInstancePhaseBindGroup(stride)
    this.alphaMask3D = new MeshInstancePhaseBindGroup(stride)
    this.transparent3D = new MeshInstancePhaseBindGroup(stride)
    this.opaque2D = new MeshInstancePhaseBindGroup(stride)
    this.alphaMask2D = new MeshInstancePhaseBindGroup(stride)
    this.transparent2D = new MeshInstancePhaseBindGroup(stride)
  }

  clear() {
    this.opaque3D.clear()
    this.alphaMask3D.clear()
    this.transparent3D.clear()
    this.opaque2D.clear()
    this.alphaMask2D.clear()
    this.transparent2D.clear()
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
   * @type {import("../../core/index.js").GPUBuffer | undefined}
   */
  #gpuBuffer

  /**
   * @type {import("../../core/index.js").WebGLBindGroup | undefined}
   */
  bindGroup

  /**
   * Mesh-instance uniforms in this phase.
   * @type {MeshInstanceUniform[]}
   */
  instances = []

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.#stride = stride
  }

  /**
   * Adds a mesh-instance uniform to this phase.
   *
   * @param {MeshInstanceUniform} meshInstance
   * @returns {number}
   */
  add(meshInstance) {
    const index = this.instances.length
    this.instances.push(meshInstance)
    return index
  }

  /**
   * Removes all mesh-instance uniforms registered for this phase.
   */
  clear() {
    this.instances.length = 0
  }

  /**
   * Ensures the phase buffer can hold the requested number of slots.
   *
   * @param {number} instanceCount
   */
  reserve(instanceCount) {
    assertTrue(Number.isInteger(instanceCount) && instanceCount >= 0, `Invalid mesh instance count ${instanceCount}`)

    const requiredSize = instanceCount * this.#stride

    if (requiredSize <= this.buffer.data.byteLength) {
      return
    }

    this.buffer.data = new ArrayBuffer(requiredSize)
  }

  /**
   * Returns the byte offset for the supplied slot index.
   *
   * @param {number} index
   * @returns {number}
   */
  getOffset(index) {
    return index * this.#stride
  }

  /**
   * Writes a payload into the slot at the supplied index.
   *
   * @param {number} index
   * @param {MeshInstanceUniform} meshInstance
   * @returns {number}
   */
  setData(index, meshInstance) {
    const offset = this.getOffset(index)

    const bufferData = this.buffer.data
    assertTrue(
      offset + this.#stride <= bufferData.byteLength,
      "MeshInstanceBindGroups capacity exceeded; call reserve() before writing mesh instances"
    )

    const slotBytes = new Uint8Array(bufferData, offset, this.#stride)

    slotBytes.fill(0)
    meshInstance.getData(new DataView(bufferData, offset, this.#stride))
    this.buffer.data = bufferData
    return offset
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
