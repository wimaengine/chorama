import { BoundingBox2D } from "maumbo"
import { AnimationClip } from "../animation/clip.js"
import { AnimationPlayer } from "../animation/player.js"
import { SpriteFrameAnimationTrack } from "../animation/tracks/spriteframe.js"
import { Sprite2D } from "../objects/sprite2d.js"
import { TextureAtlas, TextureAtlasLayout } from "../texture/index.js"
import { Loader } from "./loader.js"
import { TextureLoader } from "./texture.js"
import { arrayBufferToJSON } from "./utils.js"

/**
 * Loads Aseprite JSON exports and their referenced images into a Sprite2D.
 *
 * Each JSON path contributes one texture atlas. Frame tags in the JSON create
 * animation clips named after the tags. When no frame tags are present, the
 * JSON filename is used as the clip name. The JSON `meta.image` value is
 * resolved relative to the JSON path.
 *
 * @extends {Loader<Sprite2D, AsepriteLoadSettings>}
 */
export class AsepriteLoader extends Loader {
  /**
   * @type {TextureLoader}
   */
  textureLoader

  /**
   * @param {{textureLoader?: TextureLoader}} [options]
   */
  constructor({ textureLoader = new TextureLoader() } = {}) {
    super(Sprite2D)
    this.textureLoader = textureLoader
  }

  /**
   * @override
   * @param {ArrayBuffer[]} buffers
   * @param {Sprite2D} destination
   * @param {AsepriteLoadSettings} settings
   */
  async parse(buffers, destination, settings) {
    if (settings.name.length === 0) {
      throw new Error("AsepriteLoader requires a non-empty name")
    }

    destination.name = settings.name
    destination.atlases.length = 0
    destination.children.length = 0

    const sources = await Promise.all(buffers.map(async (buffer, index) => {
      const path = settings.paths[index]

      if (!buffer || path === undefined) {
        throw new Error("AsepriteLoader received an invalid JSON source")
      }

      const data = /** @type {AsepriteJSON} */ (arrayBufferToJSON(buffer))
      const frames = getFrames(data.frames)
      const imagePath = resolveImagePath(path, data.meta?.image)
      const texture = await this.textureLoader.asyncLoad({
        paths: [imagePath],
        generateMipmaps: settings.generateMipmaps
      })
      const atlas = createTextureAtlas(texture, frames)
      const clips = createAnimationClips(
        destination.name,
        frames,
        data.meta?.frameTags,
        getClipName(path),
        index
      )

      return { atlas, clips }
    }))

    const animationPlayer = new AnimationPlayer()

    for (const source of sources) {
      destination.atlases.push(source.atlas)

      for (const sourceClip of source.clips) {
        animationPlayer.set(sourceClip.clip)
        animationPlayer.clipsByName.set(sourceClip.name, sourceClip.clip)
      }
    }

    if (animationPlayer.animations.size > 0) {
      destination.add(animationPlayer)
    }
  }

  /**
   * @override
   * @param {AsepriteLoadSettings} settings
   */
  default(settings) {
    const sprite = new Sprite2D([])
    sprite.name = settings.name
    return sprite
  }
}

/**
 * @param {AsepriteFrames | undefined} frames
 * @returns {AsepriteFrame[]}
 */
function getFrames(frames) {
  if (Array.isArray(frames)) {
    return frames
  }

  if (frames && typeof frames === "object") {
    return Object.values(frames)
  }

  return []
}

/**
 * @param {import("../texture/index.js").Texture} texture
 * @param {AsepriteFrame[]} frames
 * @returns {TextureAtlas}
 */
function createTextureAtlas(texture, frames) {
  if (texture.width <= 0 || texture.height <= 0) {
    throw new Error("AsepriteLoader received an image with invalid dimensions")
  }

  const slices = frames.map(({ frame }) => new BoundingBox2D(
    frame.x / texture.width,
    frame.y / texture.height,
    (frame.x + frame.w) / texture.width,
    (frame.y + frame.h) / texture.height
  ))

  return new TextureAtlas(texture, new TextureAtlasLayout(slices))
}

/**
 * Creates clips for the frame tags in a JSON source, or a single filename-
 * based clip when the source does not define any tags.
 *
 * @param {string} targetName
 * @param {AsepriteFrame[]} frames
 * @param {AsepriteFrameTag[] | undefined} frameTags
 * @param {string} fallbackName
 * @param {number} atlasIndex
 * @returns {{name: string, clip: AnimationClip}[]}
 */
function createAnimationClips(
  targetName,
  frames,
  frameTags,
  fallbackName,
  atlasIndex
) {
  const clips = []

  for (const tag of getFrameTags(frameTags)) {
    if (typeof tag.name !== "string" || tag.name.length === 0) {
      continue
    }

    const frameIndices = getTagFrameIndices(tag, frames.length)
    const clip = createAnimationClip(targetName, frames, atlasIndex, frameIndices)

    if (clip !== undefined) {
      clips.push({ name: tag.name, clip })
    }
  }

  if (clips.length > 0) {
    return clips
  }

  const clip = createAnimationClip(targetName, frames, atlasIndex)
  if (clip !== undefined) {
    clips.push({ name: fallbackName, clip })
  }

  return clips
}

/**
 * @param {AsepriteFrameTag[] | undefined} frameTags
 * @returns {AsepriteFrameTag[]}
 */
function getFrameTags(frameTags) {
  return Array.isArray(frameTags) ? frameTags : []
}

/**
 * Builds the frame order for an Aseprite frame tag.
 *
 * @param {AsepriteFrameTag} tag
 * @param {number} frameCount
 * @returns {number[]}
 */
function getTagFrameIndices(tag, frameCount) {
  if (frameCount === 0 || !Number.isInteger(tag.from) || !Number.isInteger(tag.to)) {
    return []
  }

  const from = Math.max(0, Math.min(frameCount - 1, tag.from))
  const to = Math.max(0, Math.min(frameCount - 1, tag.to))
  const start = Math.min(from, to)
  const end = Math.max(from, to)
  const indices = []

  for (let index = start; index <= end; index++) {
    indices.push(index)
  }

  return indices
}

/**
 * @param {string} targetName
 * @param {AsepriteFrame[]} frames
 * @param {number} atlasIndex
 * @param {number[]} [frameIndices]
 * @returns {AnimationClip | undefined}
 */
function createAnimationClip(targetName, frames, atlasIndex, frameIndices) {
  const indices = frameIndices ?? frames.map((_, index) => index)

  if (indices.length === 0) {
    return undefined
  }

  const track = new SpriteFrameAnimationTrack()
  let time = 0

  for (const frameIndex of indices) {
    const frame = /** @type {AsepriteFrame} */ (frames[frameIndex])
    track.times.push(time)
    track.keyframes.push(atlasIndex, frameIndex)
    time += getFrameDuration(frame)
  }

  // Keep the final frame active for its complete duration and let the clip
  // duration include that final interval.
  const lastFrameIndex = /** @type {number} */ (indices[indices.length - 1])
  track.times.push(time)
  track.keyframes.push(atlasIndex, lastFrameIndex)

  const clip = new AnimationClip()
  clip.add(targetName, track)
  return clip
}

/**
 * @param {AsepriteFrame} frame
 * @returns {number}
 */
function getFrameDuration(frame) {
  const duration = typeof frame.duration === "number" && Number.isFinite(frame.duration)
    ? frame.duration
    : 0

  return Math.max(0, duration) / 1000
}

/**
 * @param {string} path
 * @param {string | undefined} image
 * @returns {string}
 */
function resolveImagePath(path, image) {
  if (typeof image !== "string" || image.length === 0) {
    throw new Error(`AsepriteLoader JSON is missing meta.image: ${path}`)
  }

  const baseUrl = new URL(path, location.href).href
  return new URL(image, baseUrl).href
}

/**
 * @param {string} path
 * @returns {string}
 */
function getClipName(path) {
  const cleanPath = path.split(/[?#]/, 1)[0] ?? path
  const fileName = cleanPath.split(/[\\/]/).pop() ?? cleanPath

  return fileName.replace(/\.json$/i, "")
}

/**
 * @typedef AsepriteLoadSettings
 * @property {string[]} paths
 * @property {string} name
 * @property {boolean} [generateMipmaps]
 */

/**
 * @typedef AsepriteJSON
 * @property {AsepriteFrames} [frames]
 * @property {{image?: string, frameTags?: AsepriteFrameTag[]}} [meta]
 */

/**
 * @typedef {AsepriteFrame[] | Record<string, AsepriteFrame>} AsepriteFrames
 */

/**
 * @typedef AsepriteFrame
 * @property {AsepriteRectangle} frame
 * @property {number} [duration]
 */

/**
 * @typedef AsepriteFrameTag
 * @property {string} name
 * @property {number} from
 * @property {number} to
 * @property {string} [direction]
 */

/**
 * @typedef AsepriteRectangle
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */
