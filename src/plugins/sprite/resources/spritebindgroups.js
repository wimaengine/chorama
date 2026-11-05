/** @import { Texture } from "../../../texture/index.js" */
/** @import { WebGLBindGroup, WebGLBindGroupLayout, WebGLRenderDevice } from "../../../core/index.js" */

/**
 * Bind groups for sprite images.
 *
 * This is intentionally independent from material bind groups: sprites have
 * no mesh material and their texture is the only resource in group 1.
 */
export class SpriteBindGroups {
  /** @readonly @type {WebGLBindGroupLayout} */
  bindGroupLayout

  /** @type {WeakMap<Texture, SpriteTextureBindGroup>} */
  #groups = new WeakMap()

  /**
   * @param {WebGLRenderDevice} device
   */
  constructor(device) {
    this.bindGroupLayout = device.createBindGroupLayout({
      label: "SpriteBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "sprite_texture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 1,
          name: "sprite_texture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })
  }

  /**
   * Returns a bind group for an image, recreating it if the cached GPU
   * texture or default sampler changed.
   *
   * @param {WebGLRenderDevice} device
   * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
   * @param {Texture} image
   * @returns {WebGLBindGroup}
   */
  getOrSet(device, renderer, image) {
    const gpuTexture = renderer.caches.getTexture(device, image)
    const gpuSampler = renderer.caches.getSampler(device, renderer.defaults.textureSampler)
    const existing = this.#groups.get(image)

    if (existing && existing.gpuTexture === gpuTexture && existing.gpuSampler === gpuSampler) {
      return existing.bindGroup
    }

    const bindGroup = device.createBindGroup({
      label: "SpriteBindGroup",
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { texture: gpuTexture }
        },
        {
          binding: 1,
          resource: { sampler: gpuSampler }
        }
      ]
    })

    this.#groups.set(image, { gpuTexture, gpuSampler, bindGroup })
    return bindGroup
  }
}

/**
 * @typedef SpriteTextureBindGroup
 * @property {import("../../../core/index.js").GPUTexture} gpuTexture
 * @property {import("../../../core/index.js").GPUSampler} gpuSampler
 * @property {import("../../../core/index.js").WebGLBindGroup} bindGroup
 */
