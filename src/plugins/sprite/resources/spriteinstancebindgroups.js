import { UniformBuffer } from "../../../core/resources/index.js"
import { snapUp } from "../../../math/index.js"
import { assert, assertTrue } from "../../../utils/index.js"
import { SpriteInstanceUniform } from "./spriteinstanceuniform.js"

/** @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../../../renderer/core/index.js").View} view */
export function resolveOpaqueSprite2DBindGroup(renderer, view) {
  const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)
  assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")
  assert(view.object, "Sprite view object missing")
  const bindGroup = spriteInstanceBindGroups.getOrSet(view.object).opaque2D.bindGroup
  assert(bindGroup, "Opaque sprite instance bind group missing")
  return bindGroup
}

/** @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../../../renderer/core/index.js").View} view */
export function resolveAlphaMaskSprite2DBindGroup(renderer, view) {
  const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)
  assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")
  assert(view.object, "Sprite view object missing")
  const bindGroup = spriteInstanceBindGroups.getOrSet(view.object).alphaMask2D.bindGroup
  assert(bindGroup, "Alpha-mask sprite instance bind group missing")
  return bindGroup
}

/** @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer @param {import("../../../renderer/core/index.js").View} view */
export function resolveTransparentSprite2DBindGroup(renderer, view) {
  const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)
  assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")
  assert(view.object, "Sprite view object missing")
  const bindGroup = spriteInstanceBindGroups.getOrSet(view.object).transparent2D.bindGroup
  assert(bindGroup, "Transparent sprite instance bind group missing")
  return bindGroup
}

/**
 * Shared per-view sprite-instance bind-group cache.
 *
 * Sprites have their own payload and bind-group layout instead of sharing the
 * mesh instance block or its phase state.
 */
export class SpriteInstanceBindGroups {
  /**
   * Raw std140 payload size for one sprite-instance block.
   * @readonly
   * @type {number}
   */
  static MinSize = SpriteInstanceUniform.BlockSize

  /** @type {number} */
  #stride

  /** @type {WeakMap<object, SpriteInstanceBindGroupEntry>} */
  #entries = new WeakMap()

  /**
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout | undefined}
   */
  bindGroupLayout

  /**
   * @param {import("../../../core/index.js").WebGLRenderDevice} renderDevice
   */
  constructor(renderDevice) {
    this.#stride = snapUp(SpriteInstanceBindGroups.MinSize, renderDevice.limits.minUniformBufferOffsetAlignment)
  }

  /**
   * Returns the sprite-instance bind-group layout.
   *
   * @param {import("../../../core/index.js").WebGLRenderDevice} device
   * @returns {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  getBindGroupLayout(device) {
    if (!this.bindGroupLayout) {
      this.bindGroupLayout = device.createBindGroupLayout({
        label: "SpriteInstanceBindGroupsLayout",
        entries: [{
          binding: 0,
          name: "SpriteInstanceBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: SpriteInstanceBindGroups.MinSize
          }
        }]
      })
    }

    assert(this.bindGroupLayout, "Sprite instance bind group layout missing")
    return this.bindGroupLayout
  }

  /**
   * Returns the cached per-view entry for an object, creating it if needed.
   *
   * @param {object} object
   * @returns {SpriteInstanceBindGroupEntry}
   */
  getOrSet(object) {
    const existing = this.#entries.get(object)

    if (existing) {
      return existing
    }

    const entry = new SpriteInstanceBindGroupEntry(this.#stride)
    this.#entries.set(object, entry)
    return entry
  }
}

/**
 * Cached sprite-instance state for a single view object.
 */
export class SpriteInstanceBindGroupEntry {
  /** @type {SpriteInstancePhaseBindGroup} */
  opaque2D

  /** @type {SpriteInstancePhaseBindGroup} */
  alphaMask2D

  /** @type {SpriteInstancePhaseBindGroup} */
  transparent2D

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.opaque2D = new SpriteInstancePhaseBindGroup(stride)
    this.alphaMask2D = new SpriteInstancePhaseBindGroup(stride)
    this.transparent2D = new SpriteInstancePhaseBindGroup(stride)
  }

  clear() {
    this.opaque2D.clear()
    this.alphaMask2D.clear()
    this.transparent2D.clear()
  }
}

/**
 * Phase-local sprite-instance payload cache.
 */
export class SpriteInstancePhaseBindGroup {
  /** @readonly @type {UniformBuffer} */
  buffer = new UniformBuffer()

  /** @type {number} */
  #stride

  /** @type {import("../../../core/index.js").GPUBuffer | undefined} */
  #gpuBuffer

  /** @type {import("../../../core/index.js").WebGLBindGroup | undefined} */
  bindGroup

  /** @type {SpriteInstanceUniform[]} */
  instances = []

  /**
   * @param {number} stride
   */
  constructor(stride) {
    this.#stride = stride
  }

  /**
   * @param {SpriteInstanceUniform} spriteInstance
   * @returns {number}
   */
  add(spriteInstance) {
    const index = this.instances.length
    this.instances.push(spriteInstance)
    return index
  }

  clear() {
    this.instances.length = 0
  }

  /**
   * @param {number} instanceCount
   */
  reserve(instanceCount) {
    assertTrue(Number.isInteger(instanceCount) && instanceCount >= 0, `Invalid sprite instance count ${instanceCount}`)

    const requiredSize = instanceCount * this.#stride

    if (requiredSize <= this.buffer.data.byteLength) {
      return
    }

    this.buffer.data = new ArrayBuffer(requiredSize)
  }

  /**
   * @param {number} index
   * @returns {number}
   */
  getOffset(index) {
    return index * this.#stride
  }

  /**
   * @param {number} index
   * @param {SpriteInstanceUniform} spriteInstance
   * @returns {number}
   */
  setData(index, spriteInstance) {
    const offset = this.getOffset(index)
    const bufferData = this.buffer.data

    assertTrue(
      offset + this.#stride <= bufferData.byteLength,
      "SpriteInstanceBindGroups capacity exceeded; call reserve() before writing sprite instances"
    )

    const slotBytes = new Uint8Array(bufferData, offset, this.#stride)
    slotBytes.fill(0)
    spriteInstance.getData(new DataView(bufferData, offset, this.#stride))
    this.buffer.data = bufferData
    return offset
  }

  /**
   * @param {import("../../../core/index.js").WebGLRenderDevice} device
   * @param {import("../../../caches/index.js").Caches} caches
   * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} layout
   * @returns {import("../../../core/index.js").WebGLBindGroup}
   */
  getBindGroup(device, caches, layout) {
    const gpuBuffer = caches.getUniformBuffer(device, this.buffer)

    if (this.bindGroup && this.#gpuBuffer === gpuBuffer) {
      return this.bindGroup
    }

    this.#gpuBuffer = gpuBuffer
    this.bindGroup = device.createBindGroup({
      label: "SpriteInstanceBindGroup",
      layout,
      entries: [{
        binding: 0,
        resource: {
          buffer: gpuBuffer,
          size: this.#stride
        }
      }]
    })

    return this.bindGroup
  }
}
