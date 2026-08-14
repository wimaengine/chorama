import { TextureFormat, TextureType } from "../constants/index.js"
import { getMipLevelSize as getWebGLMipLevelSize, getMipmapCount as getWebGLMipmapCount } from "../core/webgl/utils.js"

export class Texture {

  /**
   * Tracks if the texture has changed since last checked.
   * @type {boolean}
   */
  #changed = false

  /**
   * The raw pixel data for the texture, indexed by mip level.
   * Undefined entries can be used to skip uploads for specific mip levels.
   * @type {(ArrayBuffer | undefined)[]}
   */
  #data

  /**
   * The width of the texture in pixels.
   * @type {number}
   */
  #width

  /**
   * The height of the texture in pixels.
   * @type {number}
   */
  #height

  /**
   * The depth of the texture, used for 3D textures or texture arrays.
   * @type {number}
   */
  #depth

  /**
   * The texture format of this texture.
   * @type {TextureFormat}
   */
  #format

  /**
   * The type of texture (e.g., Texture2D, TextureCube, etc.).
   * @type {TextureType}
   */
  #type

  /**
   * @param {TextureSettings & { data?: (ArrayBuffer | undefined)[], type: TextureType }} settings
   */
  constructor({
    data,
    type,
    format = Texture.defaultSettings.format,
    width = Texture.defaultSettings.width,
    height = Texture.defaultSettings.height,
    depth = Texture.defaultSettings.depth,
  }) {
    this.#data = data ?? []
    this.#type = type
    this.#width = width
    this.#height = height
    this.#depth = depth
    this.#format = format
  }

  /**
   * @package
   * @returns {boolean}
   * This is an internal property, do not use!
   */
  get changed() {
    const previous = this.#changed
    this.#changed = false
    return previous
  }

  /** @type {(ArrayBuffer | undefined)[]} */
  get data() { return this.#data }
  set data(value) {
    this.#data = value
    this.#changed = true
  }

  /** @type {number} */
  get width() { return this.#width }
  set width(value) {
    this.#width = value
    this.#changed = true
  }

  /** @type {number} */
  get height() { return this.#height }
  set height(value) {
    this.#height = value
    this.#changed = true
  }

  /** @type {number} */
  get depth() { return this.#depth }
  set depth(value) {
    this.#depth = value
    this.#changed = true
  }

  /** @type {TextureFormat} */
  get format() { return this.#format }
  set format(value) {
    this.#format = value
    this.#changed = true
  }

  /** @type {TextureType} */
  get type() { return this.#type }
  set type(value) {
    this.#type = value
    this.#changed = true
  }

  /**
   * Applies a new set of texture settings.
   * @param {TextureSettings} settings
   */
  apply({
    format = Texture.defaultSettings.format,
    width = Texture.defaultSettings.width,
    height = Texture.defaultSettings.height,
    depth = Texture.defaultSettings.depth,
  }) {
    this.width = width
    this.height = height
    this.depth = depth
    this.format = format
  }

  /**
   * Copies the values from another texture into this one.
   * @param {this} other
   * @returns {this}
   */
  copy(other) {
    this.data = other.data.slice()
    this.format = other.format
    this.width = other.width
    this.height = other.height
    this.depth = other.depth
    this.type = other.type
    return this
  }

  /**
   * Creates a new texture that is a copy of this one.
   * @returns {this}
   */
  clone() {
    return new /** @type {new (...args:any[]) => this} */(this.constructor)({}).copy(this)
  }

  /**
   * Creates a default 1×1 white texture.
   * @returns {Texture}
   */
  static default() {
    const width = 1
    const height = 1
    const pixel = new Uint8Array([255, 255, 255, 255])
    const texture = new Texture({
      width,
      height,
      data: [pixel.buffer],
      type: TextureType.Texture2D,
    })
    return texture
  }

  /**
   * Returns the number of mip levels for the given base texture size.
   * @param {TextureType} type
   * @param {number} width
   * @param {number} height
   * @param {number} [depth=1]
   * @returns {number}
   */
  static getMipmapCount(type, width, height, depth = 1) {
    return getWebGLMipmapCount(type, width, height, depth)
  }

  /**
   * Returns the dimensions for a specific mip level.
   * @param {TextureType} type
   * @param {number} width
   * @param {number} height
   * @param {number} [depth=1]
   * @param {number} [mipmapLevel=0]
   * @returns {{ width: number, height: number, depth: number }}
   */
  static getMipLevelSize(type, width, height, depth = 1, mipmapLevel = 0) {
    return getWebGLMipLevelSize(type, width, height, depth, mipmapLevel)
  }

  /**
   * Generates the full mip chain starting with the base level.
   * Currently supported for uncompressed RGBA8 textures.
   * @param {TextureMipmapSettings} settings
   * @returns {ArrayBuffer[]}
   */
  static generateMipmaps({
    level0,
    type,
    format,
    width,
    height,
    depth = 1,
  }) {
    if (format !== TextureFormat.RGBA8Unorm) {
      throw new Error("Texture.generateMipmaps only supports TextureFormat.RGBA8Unorm")
    }

    const mipmapCount = Texture.getMipmapCount(type, width, height, depth)
    const mipmaps = [level0]
    let source = level0
    let sourceWidth = width
    let sourceHeight = height
    let sourceDepth = depth

    for (let mipmapLevel = 1; mipmapLevel < mipmapCount; mipmapLevel++) {
      const {
        width: targetWidth,
        height: targetHeight,
        depth: targetDepth
      } = Texture.getMipLevelSize(type, width, height, depth, mipmapLevel)

      const target = new ArrayBuffer(targetWidth * targetHeight * targetDepth * 4)

      if (type === TextureType.Texture3D) {
        downsampleVolumeRgba8(
          source,
          target,
          sourceWidth,
          sourceHeight,
          sourceDepth,
          targetWidth,
          targetHeight,
          targetDepth
        )
      } else {
        downsampleSlicesRgba8(
          source,
          target,
          sourceWidth,
          sourceHeight,
          sourceDepth,
          targetWidth,
          targetHeight
        )
      }

      mipmaps.push(target)
      source = target
      sourceWidth = targetWidth
      sourceHeight = targetHeight
      sourceDepth = targetDepth
    }

    return mipmaps
  }

  /**
   * Default texture settings.
   * @readonly
   * @type {Readonly<Required<TextureSettings>>}
   */
  static defaultSettings = {
    format: TextureFormat.RGBA8Unorm,
    width: 0,
    height: 0,
    depth: 1,
  }
}

/**
 * @typedef TextureSettings
 * @property {TextureFormat} [format]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [depth]
 */

/**
 * @typedef TextureMipmapSettings
 * @property {ArrayBuffer} level0
 * @property {TextureType} type
 * @property {TextureFormat} format
 * @property {number} width
 * @property {number} height
 * @property {number} [depth]
 */

/**
 * @param {ArrayBuffer} source
 * @param {ArrayBuffer} target
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} sliceCount
 * @param {number} targetWidth
 * @param {number} targetHeight
 */
function downsampleSlicesRgba8(source, target, sourceWidth, sourceHeight, sliceCount, targetWidth, targetHeight) {
  const sourceView = new Uint8Array(source)
  const targetView = new Uint8Array(target)
  const sourceSliceSize = sourceWidth * sourceHeight * 4
  const targetSliceSize = targetWidth * targetHeight * 4

  for (let slice = 0; slice < sliceCount; slice++) {
    downsampleImageRgba8(
      sourceView,
      slice * sourceSliceSize,
      sourceWidth,
      sourceHeight,
      targetView,
      slice * targetSliceSize,
      targetWidth,
      targetHeight
    )
  }
}

/**
 * @param {ArrayBuffer} source
 * @param {ArrayBuffer} target
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {number} sourceDepth
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @param {number} targetDepth
 */
function downsampleVolumeRgba8(source, target, sourceWidth, sourceHeight, sourceDepth, targetWidth, targetHeight, targetDepth) {
  const sourceView = new Uint8Array(source)
  const targetView = new Uint8Array(target)
  const sourceSliceSize = sourceWidth * sourceHeight * 4
  const targetSliceSize = targetWidth * targetHeight * 4

  for (let z = 0; z < targetDepth; z++) {
    const sourceZStart = Math.floor(z * sourceDepth / targetDepth)
    const sourceZEnd = Math.floor((z + 1) * sourceDepth / targetDepth)

    for (let y = 0; y < targetHeight; y++) {
      const sourceYStart = Math.floor(y * sourceHeight / targetHeight)
      const sourceYEnd = Math.floor((y + 1) * sourceHeight / targetHeight)

      for (let x = 0; x < targetWidth; x++) {
        const sourceXStart = Math.floor(x * sourceWidth / targetWidth)
        const sourceXEnd = Math.floor((x + 1) * sourceWidth / targetWidth)

        let red = 0
        let green = 0
        let blue = 0
        let alpha = 0
        let count = 0

        for (let sourceZ = sourceZStart; sourceZ < sourceZEnd; sourceZ++) {
          const zOffset = sourceZ * sourceSliceSize

          for (let sourceY = sourceYStart; sourceY < sourceYEnd; sourceY++) {
            const yOffset = zOffset + sourceY * sourceWidth * 4

            for (let sourceX = sourceXStart; sourceX < sourceXEnd; sourceX++) {
              const offset = yOffset + sourceX * 4
              red += sourceView[offset + 0] ?? 0
              green += sourceView[offset + 1] ?? 0
              blue += sourceView[offset + 2] ?? 0
              alpha += sourceView[offset + 3] ?? 0
              count++
            }
          }
        }

        const targetOffset = z * targetSliceSize + y * targetWidth * 4 + x * 4
        targetView[targetOffset + 0] = Math.round(red / count)
        targetView[targetOffset + 1] = Math.round(green / count)
        targetView[targetOffset + 2] = Math.round(blue / count)
        targetView[targetOffset + 3] = Math.round(alpha / count)
      }
    }
  }
}

/**
 * @param {Uint8Array} sourceView
 * @param {number} sourceOffset
 * @param {number} sourceWidth
 * @param {number} sourceHeight
 * @param {Uint8Array} targetView
 * @param {number} targetOffset
 * @param {number} targetWidth
 * @param {number} targetHeight
 */
function downsampleImageRgba8(sourceView, sourceOffset, sourceWidth, sourceHeight, targetView, targetOffset, targetWidth, targetHeight) {
  const sourceRowStride = sourceWidth * 4
  const targetRowStride = targetWidth * 4

  for (let y = 0; y < targetHeight; y++) {
    const sourceYStart = Math.floor(y * sourceHeight / targetHeight)
    const sourceYEnd = Math.floor((y + 1) * sourceHeight / targetHeight)

    for (let x = 0; x < targetWidth; x++) {
      const sourceXStart = Math.floor(x * sourceWidth / targetWidth)
      const sourceXEnd = Math.floor((x + 1) * sourceWidth / targetWidth)

      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      let count = 0

      for (let sourceY = sourceYStart; sourceY < sourceYEnd; sourceY++) {
        let offset = sourceOffset + sourceY * sourceRowStride + sourceXStart * 4

        for (let sourceX = sourceXStart; sourceX < sourceXEnd; sourceX++) {
          red += sourceView[offset + 0] ?? 0
          green += sourceView[offset + 1] ?? 0
          blue += sourceView[offset + 2] ?? 0
          alpha += sourceView[offset + 3] ?? 0
          offset += 4
          count++
        }
      }

      const writeOffset = targetOffset + y * targetRowStride + x * 4
      targetView[writeOffset + 0] = Math.round(red / count)
      targetView[writeOffset + 1] = Math.round(green / count)
      targetView[writeOffset + 2] = Math.round(blue / count)
      targetView[writeOffset + 3] = Math.round(alpha / count)
    }
  }
}
