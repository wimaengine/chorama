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
    if (buffers[0] && isCubeLut(settings)) {
      parseCubeLut(buffers[0], destination)
      return
    }

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
 * @param {TextureParseSettings} settings
 * @returns {boolean}
 */
function isCubeLut(settings) {
  const path = settings.paths?.[0] ?? ""
  return /\.cube(?:$|[?#])/i.test(path) || /cube/i.test(settings.mimeType ?? "")
}

/**
 * Parses a normalized 3D .cube LUT into a 3D RGBA texture.
 * .cube files enumerate red fastest, then green, then blue, which matches
 * the engine's x/y/z texture memory layout.
 *
 * @param {ArrayBuffer} buffer
 * @param {Texture} destination
 */
function parseCubeLut(buffer, destination) {
  const text = new TextDecoder().decode(buffer)
  const values = []
  let size
  let domainMin = [0, 0, 0]
  let domainMax = [1, 1, 1]

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim()
    if (!line) {
      continue
    }

    const tokens = line.split(/\s+/)
    const directive = tokens[0]

    if (directive === "TITLE" || directive === "LUT_3D_INPUT_RANGE" || directive === "LUT_3D_OUTPUT_RANGE") {
      continue
    }

    if (directive === "LUT_1D_SIZE") {
      throw new Error("TextureLoader only supports 3D .cube LUTs")
    }

    if (directive === "LUT_3D_SIZE") {
      size = parseInteger(tokens[1], "LUT_3D_SIZE")
      continue
    }

    if (directive === "DOMAIN_MIN" || directive === "DOMAIN_MAX") {
      const domain = tokens.slice(1, 4).map(Number)
      if (domain.length !== 3 || domain.some((value) => !Number.isFinite(value))) {
        throw new Error(`${directive} must contain three numeric values`)
      }
      if (directive === "DOMAIN_MIN") {
        domainMin = domain
      } else {
        domainMax = domain
      }
      continue
    }

    const sample = tokens.map(Number)
    if (sample.length < 3 || sample.slice(0, 3).some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid .cube LUT sample: ${line}`)
    }
    values.push(sample[0], sample[1], sample[2])
  }

  if (size === undefined || size < 2) {
    throw new Error(".cube LUT is missing a valid LUT_3D_SIZE")
  }

  if (domainMin.some((value, index) => value !== 0 || domainMax[index] !== 1)) {
    throw new Error("TextureLoader expects .cube LUTs with DOMAIN_MIN 0 and DOMAIN_MAX 1")
  }

  const expectedValueCount = size * size * size * 3
  if (values.length !== expectedValueCount) {
    throw new Error(`.cube LUT contains ${values.length / 3} samples; expected ${expectedValueCount / 3}`)
  }

  const data = new Uint8Array(size * size * size * 4)
  for (let i = 0; i < size * size * size; i++) {
    data[i * 4] = toByte(/**@type {number} */(values[i * 3]))
    data[i * 4 + 1] = toByte(/**@type {number} */(values[i * 3 + 1]))
    data[i * 4 + 2] = toByte(/**@type {number} */(values[i * 3 + 2]))
    data[i * 4 + 3] = 255
  }

  destination.data = [data.buffer]
  destination.type = TextureType.Texture3D
  destination.format = TextureFormat.RGBA8Unorm
  destination.width = size
  destination.height = size
  destination.depth = size
}

/**
 * @param {string | undefined} value
 * @param {string} name
 * @returns {number}
 */
function parseInteger(value, name) {
  const result = Number(value)
  if (!Number.isInteger(result) || result < 2) {
    throw new Error(`${name} must be an integer greater than or equal to 2`)
  }
  return result
}

/**
 * @param {number} value
 * @returns {number}
 */
function toByte(value) {
  return Math.round(Math.min(1, Math.max(0, value)) * 255)
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
