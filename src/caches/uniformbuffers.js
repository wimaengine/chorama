/** @import { WebGLRenderDevice } from "../core/index.js" */
/** @import { GPUBuffer } from "../core/resources/index.js" */
import { BufferType, BufferUsage } from "../constants/index.js"
import { UniformBufferLayout } from "../core/layouts/uniformbuffer.js"

export class UniformBuffers {
  /**
   * @type {Map<string,UniformBuffer>}
   */
  list = new Map()

  /**
   * @param {WebGLRenderDevice} device
   * @param {string} name
   * @param {UniformBufferLayout} layout
   * @returns {UniformBuffer}
   */
  set(device, name, layout) {
    const buffer = device.createBuffer({
      type: BufferType.Uniform,
      usage: BufferUsage.Dynamic,
      size: layout.size
    })
    const ubo = new UniformBuffer(buffer)
    this.list.set(name, ubo)

    return ubo
  }

  /**
   * @param {string} name
   */
  get(name) {
    return this.list.get(name)
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {string} name
   * @param {UniformBufferLayout} layout
   * @returns {UniformBuffer}
   */
  getorSet(device, name, layout) {
    const ubo = this.get(name)

    if (ubo) {
      if (ubo.size >= layout.size) {
        return ubo
      }

      ubo.destroy()
    }

    return this.set(device, name, layout)
  }
}

export class UniformBuffer {
  /**
   * @readonly
   * @type {GPUBuffer}
   */
  buffer

  /**
   * @readonly
   * @type {number}
   */
  size

  /**
   * @param {GPUBuffer} buffer
   */
  constructor(buffer) {
    this.buffer = buffer
    this.size = buffer.size
  }

  destroy() {
    this.buffer.destroy()
  }

  /**
   * @param {WebGL2RenderingContext} gl
   * @param {ArrayBuffer} data
   */
  update(gl, data) {
    gl.bindBuffer(this.buffer.type, this.buffer.inner)
    gl.bufferSubData(this.buffer.type, 0, data)
    gl.bindBuffer(this.buffer.type, null)
    return this
  }
}
