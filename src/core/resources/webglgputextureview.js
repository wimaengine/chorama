/** @import { GPUTexture } from "./gputexture.js" */
/** @import { TextureFormat } from "../../constants/index.js" */

import { TextureType } from "../../constants/index.js"

/**
 * @typedef {"1d" | "2d" | "2d-array" | "cube" | "cube-array" | "3d"} WebGLGPUTextureViewDimension
 */

/**
 * @typedef {object} WebGLGPUTextureViewDescriptor
 * @property {string} [label]
 * @property {TextureFormat} [format]
 * @property {WebGLGPUTextureViewDimension} [dimension]
 * @property {"all" | "depth-only" | "stencil-only"} [aspect]
 * @property {number} [baseMipLevel]
 * @property {number} [mipLevelCount]
 * @property {number} [baseArrayLayer]
 * @property {number} [arrayLayerCount]
 */

/** @typedef {WebGLGPUTextureViewDescriptor} GPUTextureViewDescriptor */

/**
 * @param {TextureType} type
 * @returns {WebGLGPUTextureViewDimension}
 */
function getDefaultDimension(type) {
  switch (type) {
    case TextureType.Texture2D:
      return "2d"
    case TextureType.Texture2DArray:
      return "2d-array"
    case TextureType.TextureCubeMap:
      return "cube"
    case TextureType.Texture3D:
      return "3d"
  }

  throw new Error("Unsupported texture type")
}

/**
 * @param {GPUTexture} texture
 * @param {number} baseArrayLayer
 * @returns {number}
 */
function getDefaultArrayLayerCount(texture, baseArrayLayer) {
  const layerCount = texture.type === TextureType.TextureCubeMap
    ? 6
    : texture.depth

  return layerCount - baseArrayLayer
}

/**
 * WebGL representation of a GPUTextureView.
 *
 * WebGL does not have a separate native texture-view object. The view keeps
 * the texture it was created from so bind groups and render-pass attachments
 * can use the view while uploads and copies continue to use the texture.
 */
export class WebGLGPUTextureView {
  /**
   * @readonly
   * @type {string | undefined}
   */
  label

  /**
   * @readonly
   * @type {GPUTexture}
   */
  texture

  /**
   * @readonly
   * @type {TextureFormat}
   */
  format

  /**
   * @readonly
   * @type {WebGLGPUTextureViewDimension}
   */
  dimension

  /**
   * @readonly
   * @type {"all" | "depth-only" | "stencil-only"}
   */
  aspect

  /**
   * @readonly
   * @type {number}
   */
  baseMipLevel

  /**
   * @readonly
   * @type {number}
   */
  mipLevelCount

  /**
   * @readonly
   * @type {number}
   */
  baseArrayLayer

  /**
   * @readonly
   * @type {number}
   */
  arrayLayerCount

  /**
   * @param {GPUTexture} texture
   * @param {GPUTextureViewDescriptor} [descriptor]
   */
  constructor(texture, descriptor = {}) {
    const baseMipLevel = descriptor.baseMipLevel ?? 0
    const baseArrayLayer = descriptor.baseArrayLayer ?? 0

    this.label = descriptor.label
    this.texture = texture
    this.format = descriptor.format ?? texture.actualFormat
    this.dimension = descriptor.dimension ?? getDefaultDimension(texture.type)
    this.aspect = descriptor.aspect ?? "all"
    this.baseMipLevel = baseMipLevel
    this.mipLevelCount = descriptor.mipLevelCount ?? texture.mipmapCount - baseMipLevel
    this.baseArrayLayer = baseArrayLayer
    this.arrayLayerCount = descriptor.arrayLayerCount ?? getDefaultArrayLayerCount(texture, baseArrayLayer)
  }
}
