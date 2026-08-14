/** @import { TextureSettings } from '../texture/index.js' */

import { TextureFormat, TextureType, getTextureFormatSize } from '../constants/index.js';
import { Texture } from '../texture/index.js';
import { assert } from '../utils/index.js';
import { Loader, OnAssetLoadedStrategy } from './loader.js';
import { flipImageData } from './utils.js';

/**
 * @extends {Loader<Texture,TextureLoadSettings>}
 */
export class TextureLoader extends Loader {

  constructor() {
    super(Texture)
    this.strategy = OnAssetLoadedStrategy.Original
  }

  /**
   * @override
   * @param {ArrayBuffer[]} buffers
   * @param {Texture} destination
   * @param {TextureParseSettings} [settings]
   */
  async parse(buffers, destination, settings = {}) {
    const textureFormat = TextureFormat.RGBA8Unorm
    const pixelSize = getTextureFormatSize(textureFormat)
    const {
      flipX = false,
      flipY = false,
      generateMipmaps = false,
      type = destination.type ?? TextureType.Texture2D
    } = settings
    const imagePromises = buffers.map(async (buffer) => {
      const blob = new Blob(
        [buffer],
        settings.mimeType ? { type: settings.mimeType } : undefined
      )
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext('2d')

      assert(ctx, "Could not create context to load image.")
      ctx.drawImage(bitmap, 0, 0)

      const pixels = ctx.getImageData(0, 0, bitmap.width, bitmap.height, {
        colorSpace: "srgb"
      }).data.buffer

      return {
        width: bitmap.width,
        height: bitmap.height,
        pixels: flipImageData(pixels, bitmap.width, bitmap.height, pixelSize, {
          flipX,
          flipY
        })
      }
    })
    const images = await Promise.all(imagePromises)
    const firstImage = images[0]
    const width = firstImage?.width || 0
    const height = firstImage?.height || 0
    const depth = images.length
    const sliceSize = pixelSize * width * height
    const buffer = new ArrayBuffer(
      sliceSize * depth
    )
    images.forEach((image, i) => {
      assert(
        image.width === width && image.height === height,
        "Texture images must have matching dimensions."
      )
      const sourceView = new Uint8Array(image.pixels)
      const destView = new Uint8Array(buffer, sliceSize * i, sliceSize)
      destView.set(sourceView)
    })

    const textureData = generateMipmaps
      ? Texture.generateMipmaps({
        level0: buffer,
        type,
        format: textureFormat,
        width,
        height,
        depth
      })
      : [buffer]

    destination.data = textureData
    destination.type = type
    destination.format = textureFormat
    destination.width = width
    destination.height = height
    destination.depth = depth
  }

  /**
   * @override
   * @param {TextureLoadSettings} settings
   */
  default(settings) {
    const pixel = new Uint8Array(
      settings.paths.flatMap(()=>[255, 0, 255, 255])
    )
    const texture = new Texture({
      ...(settings.textureSettings || {}),
      data: [pixel.buffer],
      type: settings.type || TextureType.Texture2D,
      width: 1,
      height: 1,
      depth: settings.paths.length
    })

    return texture
  }
}

/**
 * @typedef TextureLoadSettings
 * @property {string[]} paths
 * @property {TextureType} [type]
 * @property {string} [mimeType]
 * @property {boolean} [flipX]
 * @property {boolean} [flipY]
 * @property {boolean} [generateMipmaps]
 * @property {TextureSettings} [textureSettings]
 */

/**
 * @typedef TextureParseSettings
 * @property {string[]} [paths]
 * @property {TextureType} [type]
 * @property {string} [mimeType]
 * @property {boolean} [flipX]
 * @property {boolean} [flipY]
 * @property {boolean} [generateMipmaps]
 * @property {TextureSettings} [textureSettings]
 */
