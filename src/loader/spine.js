import { Object2D, Bone2D, MeshMaterial2D, Skin } from "../objects/index.js"
import { Affine2 } from "../math/index.js"
import { createMesh2dFromArrays } from "../mesh/builders/geometry.js"
import { CullFace } from "../constants/index.js"
import { BasicMaterial, TransparentMode } from "../material/index.js"
import { AnimationClip } from "../animation/clip.js"
import { AnimationPlayer } from "../animation/player.js"
import { AnimationMode } from "../animation/track.js"
import { Position2DAnimationTrack, Rotation2DAnimationTrack } from "../animation/tracks/index.js"
import { Loader } from "./loader.js"
import { TextureLoader } from "./texture.js"
import { arrayBufferToJSON, arrayBufferToText } from "./utils.js"

/**
 * Loads the subset of Spine 4 JSON exports supported by the current 2D
 * renderer: the default skin, mesh attachments, Bone2D transforms, Skin2D
 * weights, and translate/rotate animation timelines.
 *
 * The caller supplies the JSON and atlas paths as `paths[0]` and `paths[1]`.
 * The image path is read from the atlas page header.
 *
 * @extends {Loader<Object2D, Spine2DLoadSettings>}
 */
export class Spine2DLoader extends Loader {
  /**
   * @type {TextureLoader}
   */
  textureLoader

  /**
   * @override
   * @protected
   * @type {(destination: Object2D, source: Object2D) => void}
   */
  copyFn = (destination, source) => {
    /** @type {Map<import("../objects/index.js").ObjectBase, import("../objects/index.js").ObjectBase>} */
    const entityMap = new Map()
    destination.copy(source, entityMap)

    destination.traverseDFS((object) => {
      if (!(object instanceof MeshMaterial2D) || !object.skin) {
        return true
      }

      object.skin.bones = object.skin.bones.map((bone) => {
        return /** @type {import("../objects/index.js").Bone2D} */ (entityMap.get(bone) ?? bone)
      })
      return true
    })
  }

  /**
   * @param {{textureLoader?: TextureLoader}} [options]
   */
  constructor({ textureLoader = new TextureLoader() } = {}) {
    super(Object2D)
    this.textureLoader = textureLoader
  }

  /**
   * @override
   * @param {ArrayBuffer[]} buffers
   * @param {Object2D} destination
   * @param {Spine2DLoadSettings} settings
   */
  async parse(buffers, destination, settings) {
    const buffer = buffers[0]
    const atlasBuffer = buffers[1]
    const jsonPath = settings.paths[0]
    const atlasPath = settings.paths[1]

    if (!buffer || !atlasBuffer || !jsonPath || !atlasPath) {
      throw new Error("Spine2DLoader requires JSON and atlas paths")
    }

    const data = /** @type {SpineJSON} */ (arrayBufferToJSON(buffer))

    destination.name = settings.name ?? getFileName(jsonPath)
    destination.children.length = 0

    const atlasUrl = new URL(atlasPath, location.href).href

    const pages = parseAtlas(arrayBufferToText(atlasBuffer))
    if (pages.length === 0) {
      throw new Error(`Spine2DLoader atlas has no pages: ${atlasUrl}`)
    }

    await Promise.all(pages.map(async (page) => {
      const imageUrl = new URL(page.name, atlasUrl).href
      page.texture = await this.textureLoader.asyncLoad({
        paths: [imageUrl],
        generateMipmaps: settings.generateMipmaps
      })

      if (
        page.texture.width > 0 &&
        page.texture.height > 0 &&
        (page.texture.width !== page.width || page.texture.height !== page.height)
      ) {
        throw new Error(`Spine2DLoader: atlas page ${page.name} is ${page.width}x${page.height}, but its image is ${page.texture.width}x${page.texture.height}`)
      }
    }))

    const regionMap = createRegionMap(pages)
    const { bones, setup } = createBones(data.bones, destination)
    updateTransforms(destination)

    const skin = /** @type {import("../objects/index.js").Skin2D} */ (new Skin(new Affine2()))
    skin.bones = bones
    skin.setBindPose()

    const defaultSkin = getDefaultSkin(data.skins)
    const materialByPage = new Map()
    const slots = Array.isArray(data.slots) ? data.slots : []

    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]
      if (!slot || typeof slot.name !== "string") {
        continue
      }

      const attachmentName = typeof slot.attachment === "string"
        ? slot.attachment
        : undefined
      const attachment = getSlotAttachment(defaultSkin, slot.name, attachmentName)

      if (!attachment) {
        continue
      }

      if (attachment.type !== undefined && attachment.type !== "mesh") {
        console.warn(`Spine2DLoader: slot ${slot.name} uses unsupported attachment type ${attachment.type}`)
        continue
      }

      const regionName = typeof attachment.path === "string" && attachment.path.length > 0
        ? attachment.path
        : attachmentName ?? slot.name
      const region = regionMap.get(regionName)

      if (!region) {
        throw new Error(`Spine2DLoader: attachment ${regionName} has no atlas region`)
      }

      const mesh = createAttachmentMesh(
        attachment,
        slot,
        bones,
        region
      )
      const material = getPageMaterial(region.page, materialByPage, settings)
      const object = new MeshMaterial2D(mesh, material)
      object.name = slot.name
      object.skin = skin
      object.zIndex = slotIndex
      destination.add(object)
    }

    const animationPlayer = createAnimationPlayer(data.animations, bones, setup, settings)
    if (animationPlayer) {
      destination.add(animationPlayer)
    }
  }

  /**
   * @override
   * @param {Spine2DLoadSettings} settings
   */
  default(settings) {
    const object = new Object2D()
    object.name = settings.name ?? getFileName(settings.paths[0] ?? "spine")
    return object
  }
}

/**
 * @param {SpineBoneData[] | undefined} boneData
 * @param {Object2D} destination
 * @returns {{bones: Bone2D[], setup: Map<string, SpineBoneSetup>}}
 */
function createBones(boneData, destination) {
  /** @type {Bone2D[]} */
  const bones = []
  const setup = new Map()
  const byName = new Map()
  const source = Array.isArray(boneData) ? boneData : []

  source.forEach((data, index) => {
    if (!data || typeof data.name !== "string" || data.name.length === 0) {
      console.warn(`Spine2DLoader: bone ${index} is missing a name`)
      return
    }

    const x = data.x || 0
    const y = data.y || 0
    const rotation = (data.rotation || 0) * Math.PI / 180
    const scaleX = data.scaleX || 1
    const scaleY = data.scaleY || 1
    const bone = new Bone2D()
    bone.name = data.name
    bone.index = index
    bone.transform.position.set(x, y)
    bone.transform.rotation.set(Math.cos(rotation), Math.sin(rotation))
    bone.transform.scale.set(scaleX, scaleY)
    bones[index] = bone
    byName.set(data.name, bone)
    setup.set(data.name, { x, y, rotation })

    if ((data.shearX || 0) !== 0 || (data.shearY || 0) !== 0) {
      console.warn(`Spine2DLoader: bone ${data.name} uses shear, which is not supported by Bone2D`)
    }

    if (data.transform !== undefined || data.inherit !== undefined) {
      console.warn(`Spine2DLoader: bone ${data.name} uses an advanced transform mode, which is ignored`)
    }
  })

  source.forEach((data) => {
    if (!data || typeof data.name !== "string") {
      return
    }

    const bone = byName.get(data.name)
    if (!bone) {
      return
    }

    const parent = typeof data.parent === "string" ? byName.get(data.parent) : undefined
    if (parent) {
      parent.add(bone)
    } else {
      destination.add(bone)
    }

    if (data.parent !== undefined && !parent) {
      throw new Error(`Spine2DLoader: bone ${data.name} references a missing parent ${data.parent}`)
    }
  })

  return {
    bones,
    setup
  }
}

/**
 * @param {Object2D} root
 */
function updateTransforms(root) {
  root.traverseDFS((object) => {
    if (object instanceof Object2D) {
      object.update()
    }
    return true
  })
}

/**
 * @param {SpineSkinData[] | undefined} skins
 * @returns {SpineSkinData | undefined}
 */
function getDefaultSkin(skins) {
  if (!Array.isArray(skins) || skins.length === 0) {
    throw new Error(`Spine2DLoader: JSON does not contain a skin`)
  }

  const defaultSkin = skins.find((skin) => skin?.name === "default") ?? skins[0]
  if (skins.length > 1) {
    console.warn(`Spine2DLoader: only the default skin is supported; other skins are ignored`)
  }
  return defaultSkin
}

/**
 * @param {SpineSkinData | undefined} skin
 * @param {string} slotName
 * @param {string | undefined} attachmentName
 * @returns {SpineAttachmentData | undefined}
 */
function getSlotAttachment(skin, slotName, attachmentName) {
  const attachments = skin?.attachments?.[slotName]
  if (!attachments || typeof attachments !== "object") {
    return undefined
  }

  if (attachmentName && attachments[attachmentName]) {
    return attachments[attachmentName]
  }

  const names = Object.keys(attachments)
  if (names.length === 1) {
    const name = names[0]
    return name ? attachments[name] : undefined
  }

  return undefined
}

/**
 * @param {SpineAttachmentData} attachment
 * @param {SpineSlotData} slot
 * @param {Bone2D[]} bones
 * @param {{page: SpineAtlasPage, region: SpineAtlasRegion}} region
 * @returns {import("../mesh/index.js").Mesh}
 */
function createAttachmentMesh(attachment, slot, bones, region) {
  const uvSource = Array.isArray(attachment.uvs) ? attachment.uvs : []
  const vertexCount = uvSource.length / 2
  const vertices = Array.isArray(attachment.vertices) ? attachment.vertices : []
  const weighted = vertices.length !== vertexCount * 2
  const positions = []
  const uvs = []
  const jointIndices = []
  const jointWeights = []
  const slotBoneIndex = bones.findIndex((bone) => bone.name === slot.bone)
  const fallbackBoneIndex = slotBoneIndex >= 0 ? slotBoneIndex : 0

  if (vertexCount === 0 || !Array.isArray(attachment.triangles)) {
    throw new Error(`Spine2DLoader attachment ${attachment.name ?? "unknown"} has invalid geometry`)
  }

  if (!weighted && vertices.length !== vertexCount * 2) {
    throw new Error(`Spine2DLoader attachment ${attachment.name ?? "unknown"} has invalid vertices`)
  }

  let vertexOffset = 0
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    /** @type {{index: number, x: number, y: number, weight: number}[]} */
    let influences

    if (weighted) {
      const influenceCount = Math.max(0, Math.floor(vertices[vertexOffset++] ?? 0))
      influences = []

      for (let influence = 0; influence < influenceCount; influence++) {
        const index = Math.floor(vertices[vertexOffset++] ?? -1)
        const x = vertices[vertexOffset++] ?? 0
        const y = vertices[vertexOffset++] ?? 0
        const weight = vertices[vertexOffset++] ?? 0

        if (index >= 0 && index < bones.length && Number.isFinite(weight)) {
          influences.push({ index, x, y, weight: Math.max(0, weight) })
        }
      }
    } else {
      const x = vertices[vertex * 2] ?? 0
      const y = vertices[vertex * 2 + 1] ?? 0
      influences = [{ index: fallbackBoneIndex, x, y, weight: 1 }]
    }

    influences.sort((a, b) => b.weight - a.weight)
    influences = influences.slice(0, 4)

    let weightSum = influences.reduce((sum, influence) => sum + influence.weight, 0)
    if (weightSum <= 0 || influences.length === 0) {
      influences = [{ index: fallbackBoneIndex, x: 0, y: 0, weight: 1 }]
      weightSum = 1
    }

    let bindX = 0
    let bindY = 0
    for (const influence of influences) {
      const bone = bones[influence.index]
      if (!bone) {
        continue
      }

      const weight = influence.weight / weightSum
      const world = bone.transform.world
      bindX += (world.a * influence.x + world.c * influence.y + world.x) * weight
      bindY += (world.b * influence.x + world.d * influence.y + world.y) * weight
    }

    positions.push(bindX, bindY)

    for (let influence = 0; influence < 4; influence++) {
      const entry = influences[influence]
      jointIndices.push(entry?.index ?? fallbackBoneIndex)
      jointWeights.push(entry ? entry.weight / weightSum : 0)
    }

    const localU = uvSource[vertex * 2] ?? 0
    const localV = uvSource[vertex * 2 + 1] ?? 0
    const [u, v] = mapRegionUV(localU, localV, region.region, region.page)
    uvs.push(u, v)
  }

  if (weighted && vertexOffset > vertices.length) {
    throw new Error(`Spine2DLoader: attachment ${attachment.name ?? "unknown"} contains truncated weighted vertices`)
  }

  return createMesh2dFromArrays({
    positions,
    uvs,
    jointIndices,
    jointWeights,
    indices: attachment.triangles
  })
}

/**
 * @param {number} u
 * @param {number} v
 * @param {SpineAtlasRegion} region
 * @param {SpineAtlasPage} page
 * @returns {[number, number]}
 */
function mapRegionUV(u, v, region, page) {
  let packedU = u
  let packedV = v
  let packedWidth = region.width
  let packedHeight = region.height

  switch (region.rotation) {
    case 90:
      packedU = v
      packedV = 1 - u
      packedWidth = region.height
      packedHeight = region.width
      break
    case 180:
      packedU = 1 - u
      packedV = 1 - v
      break
    case 270:
      packedU = 1 - v
      packedV = u
      packedWidth = region.height
      packedHeight = region.width
      break
  }

  return [
    (region.x + packedWidth * packedU) / page.width,
    (region.y + packedHeight * packedV) / page.height
  ]
}

/**
 * @param {SpineAtlasPage} page
 * @param {Map<SpineAtlasPage, import("../material/index.js").RawMaterial>} materials
 * @param {Spine2DLoadSettings} settings
 */
function getPageMaterial(page, materials, settings) {
  const existing = materials.get(page)
  if (existing) {
    return existing
  }

  if (!page.texture) {
    throw new Error(`Spine2DLoader atlas page ${page.name} has no texture`)
  }

  const material = settings.createMaterial
    ? settings.createMaterial(page.texture, page.name)
    : new BasicMaterial({ mainTexture: page.texture })

  if (!settings.createMaterial && material instanceof BasicMaterial) {
    material.cullFace = CullFace.None
    material.alphaBlend = new TransparentMode()
  }

  materials.set(page, material)
  return material
}

/**
 * @param {Record<string, SpineAnimationData> | undefined} animations
 * @param {Bone2D[]} bones
 * @param {Map<string, SpineBoneSetup>} setup
 * @param {Spine2DLoadSettings} settings
 * @returns {AnimationPlayer | undefined}
 */
function createAnimationPlayer(animations, bones, setup, settings) {
  if (!animations || typeof animations !== "object") {
    return undefined
  }

  const player = new AnimationPlayer()
  const clips = new Map()

  for (const [name, animation] of Object.entries(animations)) {
    if (!animation || typeof animation !== "object") {
      continue
    }

    const clip = new AnimationClip()

    for (const bone of bones) {
      const pose = setup.get(bone.name)
      if (!pose) {
        continue
      }

      const position = new Position2DAnimationTrack()
      position.times = [0]
      position.keyframes = [pose.x, pose.y]
      clip.add(bone.name, position)

      const rotation = new Rotation2DAnimationTrack()
      rotation.times = [0]
      rotation.keyframes = [pose.rotation]
      clip.add(bone.name, rotation)
    }

    const boneTimelines = animation.bones
    if (boneTimelines && typeof boneTimelines === "object") {
      for (const [boneName, timeline] of Object.entries(boneTimelines)) {
        const pose = setup.get(boneName)
        if (!pose || !timeline || typeof timeline !== "object") {
          if (!pose) {
            console.warn(`Spine2DLoader: animation ${name} targets unknown bone ${boneName}`)
          }
          continue
        }

        if (Array.isArray(timeline.translate)) {
          const track = createTimelineTrack(
            "position",
            timeline.translate,
            pose.x,
            pose.y,
            `animation ${name} bone ${boneName} translate`
          )
          if (track) {
            clip.add(boneName, track)
          }
        }

        if (Array.isArray(timeline.rotate)) {
          const track = createTimelineTrack(
            "rotation",
            timeline.rotate,
            pose.rotation,
            0,
            `animation ${name} bone ${boneName} rotate`
          )
          if (track) {
            clip.add(boneName, track)
          }
        }

        if (timeline.scale !== undefined || timeline.shear !== undefined) {
          console.warn(`Spine2DLoader: animation ${name} bone ${boneName} uses unsupported scale or shear timelines`)
        }
      }
    }

    const animationRecord = /** @type {Record<string, unknown>} */ (animation)
    for (const key of ["slots", "deform", "draworder", "drawOrder", "events", "ik", "transform", "path", "physics"]) {
      if (animationRecord[key] !== undefined) {
        console.warn(`Spine2DLoader: animation ${name} contains unsupported ${key} timelines`)
      }
    }

    if (clip.tracks.size > 0 && clip.validate()) {
      clips.set(name, clip)
    }
  }

  clips.forEach((clip, name) => {
    player.clipsByName.set(name, clip)
  })

  const activeName = settings.animation
  if (activeName) {
    const activeClip = clips.get(activeName)
    if (activeClip) {
      player.set(activeClip)
    }
  }

  return clips.size > 0 ? player : undefined
}

/**
 * @typedef {"step" | "linear" | "cubic"} SpineInterpolation
 */

/**
 * @typedef SpineAnimationSample
 * @property {number} time
 * @property {number[]} values
 */

/**
 * @typedef SpineAnimationSegment
 * @property {SpineInterpolation} kind
 * @property {number[]} [curve]
 */

/**
 * @param {"position" | "rotation"} kind
 * @param {SpineTimelineFrame[]} frames
 * @param {number} baseA
 * @param {number} baseB
 * @param {string} label
 * @returns {import("../animation/track.js").AnimationTrack | undefined}
 */
function createTimelineTrack(kind, frames, baseA, baseB, label) {
  if (frames.length === 0) {
    return undefined
  }

  const componentCount = kind === "position" ? 2 : 1
  const track = kind === "position"
    ? new Position2DAnimationTrack()
    : new Rotation2DAnimationTrack()
  const frameSamples = frames.map((frame) => ({
    time: Math.max(0, frame.time || 0),
    values: kind === "position"
      ? [
          baseA + (frame.x || 0),
          baseB + (frame.y || 0)
        ]
      : [baseA + (frame.value || frame.angle || 0) * Math.PI / 180]
  }))
  const firstTime = frameSamples[0]?.time ?? 0
  const baseValues = kind === "position" ? [baseA, baseB] : [baseA]
  const curveValueScales = kind === "position" ? [1, 1] : [Math.PI / 180]
  /** @type {SpineAnimationSample[]} */
  const samples = firstTime > 0
    ? [{ time: 0, values: baseValues }, ...frameSamples]
    : frameSamples
  /** @type {SpineAnimationSegment[]} */
  const segments = []

  if (firstTime > 0) {
    // Spine keeps the setup pose until the first timeline keyframe.
    segments.push({ kind: "step" })
  }

  for (let i = 0; i < frames.length - 1; i++) {
    const frame = frames[i]
    segments.push(createSpineAnimationSegment(frame?.curve, componentCount, label))
  }

  const mode = getSpineTrackMode(segments)
  track.mode = mode

  const expanded = expandSpineSamples(samples, segments, mode)
  track.times = expanded.samples.map((sample) => sample.time)
  track.keyframes = []
  for (const sample of expanded.samples) {
    track.keyframes.push(...sample.values)
  }

  if (mode === AnimationMode.Cubic) {
    setSpineCubicTangents(
      track,
      expanded.samples,
      expanded.segments,
      baseValues,
      curveValueScales
    )
  }

  return track.validate() ? track : undefined
}

/**
 * @param {"stepped" | number[] | undefined} curve
 * @param {number} componentCount
 * @param {string} label
 * @returns {SpineAnimationSegment}
 */
function createSpineAnimationSegment(curve, componentCount, label) {
  if (curve === "stepped") {
    return { kind: "step" }
  }

  if (curve === undefined) {
    return { kind: "linear" }
  }

  if (Array.isArray(curve) && hasSpineCurveControls(curve, componentCount)) {
    return { kind: "cubic", curve: curve.slice() }
  }

  console.warn(`Spine2DLoader: ${label} has an unsupported curve; using linear interpolation`)
  return { kind: "linear" }
}

/**
 * @param {SpineAnimationSegment[]} segments
 * @returns {number}
 */
function getSpineTrackMode(segments) {
  if (segments.length === 0) {
    return AnimationMode.Linear
  }

  if (segments.every((segment) => segment.kind === "step")) {
    return AnimationMode.Step
  }

  if (segments.some((segment) => segment.kind === "cubic")) {
    return AnimationMode.Cubic
  }

  return AnimationMode.Linear
}

/**
 * @param {SpineAnimationSample[]} samples
 * @param {SpineAnimationSegment[]} segments
 * @param {number} mode
 * @returns {{samples: SpineAnimationSample[], segments: SpineAnimationSegment[]}}
 */
function expandSpineSamples(samples, segments, mode) {
  const first = samples[0]
  if (!first) {
    return { samples: [], segments: [] }
  }

  /** @type {SpineAnimationSample[]} */
  const expandedSamples = [{ time: first.time, values: first.values.slice() }]
  /** @type {SpineAnimationSegment[]} */
  const expandedSegments = []

  for (let i = 0; i < segments.length; i++) {
    const start = samples[i]
    const end = samples[i + 1]
    const segment = segments[i]

    if (!start || !end || !segment) {
      continue
    }

    if (segment.kind === "step" && mode !== AnimationMode.Step && end.time > start.time) {
      const holdTime = getSpineStepHoldTime(start.time, end.time)

      if (holdTime > start.time && holdTime < end.time) {
        expandedSamples.push({
          time: holdTime,
          values: start.values.slice()
        })
        expandedSegments.push({ kind: "linear" })
      }

      expandedSamples.push({ time: end.time, values: end.values.slice() })
      expandedSegments.push({ kind: "linear" })
    } else {
      expandedSamples.push({ time: end.time, values: end.values.slice() })
      expandedSegments.push(segment)
    }
  }

  return {
    samples: expandedSamples,
    segments: expandedSegments
  }
}

/**
 * Leaves a stepped segment at its old value until just before the next
 * keyframe, where the selected track interpolation can perform the jump.
 *
 * @param {number} start
 * @param {number} end
 * @returns {number}
 */
function getSpineStepHoldTime(start, end) {
  const duration = end - start
  const epsilon = Math.min(
    duration * 0.0001,
    duration * 0.5
  )
  return end - epsilon
}

/**
 * @param {import("../animation/track.js").AnimationTrack} track
 * @param {SpineAnimationSample[]} samples
 * @param {SpineAnimationSegment[]} segments
 * @param {number[]} baseValues
 * @param {number[]} curveValueScales
 */
function setSpineCubicTangents(track, samples, segments, baseValues, curveValueScales) {
  const componentCount = track.elementSize()
  const tangentCount = samples.length * componentCount
  track.inTangents = new Array(tangentCount).fill(0)
  track.outTangents = new Array(tangentCount).fill(0)

  for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
    const start = samples[segmentIndex]
    const end = samples[segmentIndex + 1]
    const segment = segments[segmentIndex]

    if (!start || !end || !segment) {
      continue
    }

    const duration = end.time - start.time
    const startOffset = segmentIndex * componentCount
    const endOffset = (segmentIndex + 1) * componentCount

    for (let component = 0; component < componentCount; component++) {
      const startValue = start.values[component] ?? 0
      const endValue = end.values[component] ?? startValue
      const linearTangent = duration > 0
        ? (endValue - startValue) / duration
        : 0
      let outTangent = linearTangent
      let inTangent = linearTangent

      if (segment.kind === "cubic" && duration > 0) {
        const controls = getSpineCurveControls(segment.curve, component, componentCount)
        if (controls) {
          const curveBase = baseValues[component] ?? 0
          const curveValueScale = curveValueScales[component] ?? 1
          const controlStart = curveBase + controls[1] * curveValueScale
          const controlEnd = curveBase + controls[3] * curveValueScale
          const convertedOut = getSpineBezierTangent(
            startValue,
            controlStart,
            duration,
            controls[0]
          )
          const convertedIn = getSpineBezierTangent(
            controlEnd,
            endValue,
            duration,
            1 - controls[2]
          )

          if (convertedOut !== undefined) {
            outTangent = convertedOut
          }
          if (convertedIn !== undefined) {
            inTangent = convertedIn
          }
        }
      }

      track.outTangents[startOffset + component] = outTangent
      track.inTangents[endOffset + component] = inTangent
    }
  }
}

/**
 * @param {number} startValue
 * @param {number} controlValue
 * @param {number} duration
 * @param {number} timeFraction
 * @returns {number | undefined}
 */
function getSpineBezierTangent(startValue, controlValue, duration, timeFraction) {
  if (duration <= 0 || Math.abs(timeFraction) < 1e-8) {
    return undefined
  }

  const tangent = 3 * (controlValue - startValue) / (duration * timeFraction)
  return Number.isFinite(tangent) ? tangent : undefined
}

/**
 * @param {number[] | undefined} curve
 * @param {number} component
 * @param {number} componentCount
 * @returns {[number, number, number, number] | undefined}
 */
function getSpineCurveControls(curve, component, componentCount) {
  if (!Array.isArray(curve) || curve.length < 4) {
    return undefined
  }

  const offset = curve.length >= componentCount * 4 ? component * 4 : 0
  const controls = curve.slice(offset, offset + 4)

  if (controls.length < 4 || controls.some((value) => !Number.isFinite(value))) {
    return undefined
  }

  return /** @type {[number, number, number, number]} */ (controls)
}

/**
 * @param {number[]} curve
 * @param {number} componentCount
 * @returns {boolean}
 */
function hasSpineCurveControls(curve, componentCount) {
  for (let component = 0; component < componentCount; component++) {
    if (getSpineCurveControls(curve, component, componentCount)) {
      return true
    }
  }

  return false
}

/**
 * @param {SpineAtlasPage[]} pages
 * @returns {Map<string, {page: SpineAtlasPage, region: SpineAtlasRegion}>}
 */
function createRegionMap(pages) {
  const regions = new Map()
  for (const page of pages) {
    for (const [name, region] of page.regions) {
      regions.set(name, { page, region })
    }
  }
  return regions
}

/**
 * Parses both old blank-line-separated atlas files and the compact format
 * emitted by the included Spine export.
 *
 * @param {string} text
 * @returns {SpineAtlasPage[]}
 */
function parseAtlas(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  const pages = []
  let index = 0

  while (true) {
    index = skipBlankLines(lines, index)
    if (index >= lines.length) {
      break
    }

    const name = lines[index++]
    if (!name) {
      throw new Error("Spine2DLoader atlas contains an unnamed page")
    }

    const pageFields = readAtlasFields(lines, index)
    index = pageFields.nextIndex

    const size = parseNumbers(pageFields.fields["size"], 2)
    const pageWidth = size?.[0]
    const pageHeight = size?.[1]
    if (pageWidth === undefined || pageHeight === undefined) {
      throw new Error(`Spine2DLoader atlas page ${name} has no size`)
    }

    /** @type {SpineAtlasPage} */
    const page = {
      name,
      width: pageWidth,
      height: pageHeight,
      regions: new Map(),
      texture: undefined
    }

    while (true) {
      index = skipBlankLines(lines, index)
      if (index >= lines.length || looksLikePage(lines, index)) {
        break
      }

      const regionName = lines[index++]
      if (!regionName) {
        throw new Error(`Spine2DLoader atlas page ${name} contains an unnamed region`)
      }

      const regionFields = readAtlasFields(lines, index)
      index = regionFields.nextIndex
      const fields = regionFields.fields
      const bounds = parseNumbers(fields["bounds"], 4)
      const xy = parseNumbers(fields["xy"], 2)
      const regionSize = parseNumbers(fields["size"], 2)
      const rectangle = bounds ?? (
        xy && regionSize
          ? [xy[0], xy[1], regionSize[0], regionSize[1]]
          : undefined
      )

      const x = rectangle?.[0]
      const y = rectangle?.[1]
      const width = rectangle?.[2]
      const height = rectangle?.[3]
      if (x === undefined || y === undefined || width === undefined || height === undefined) {
        throw new Error(`Spine2DLoader atlas region ${regionName} has no bounds`)
      }

      const rotationValue = Number.parseFloat(fields["rotate"] ?? "0")
      const rotation = Number.isFinite(rotationValue)
        ? ((rotationValue % 360) + 360) % 360
        : fields["rotate"] === "true" ? 90 : 0

      page.regions.set(regionName, {
        x,
        y,
        width,
        height,
        rotation
      })
    }

    pages.push(page)
  }

  return pages
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {{fields: Record<string, string>, nextIndex: number}}
 */
function readAtlasFields(lines, start) {
  /** @type {Record<string, string>} */
  const fields = {}
  let index = start

  while (index < lines.length) {
    const line = lines[index]
    if (!line) {
      index++
      continue
    }

    const separator = line.indexOf(":")
    if (separator < 0) {
      break
    }

    const key = line.slice(0, separator).trim()
    fields[key] = line.slice(separator + 1).trim()
    index++
  }

  return { fields, nextIndex: index }
}

/**
 * @param {string[]} lines
 * @param {number} index
 * @returns {boolean}
 */
function looksLikePage(lines, index) {
  if (lines[index]?.includes(":")) {
    return false
  }

  let next = skipBlankLines(lines, index + 1)
  return lines[next]?.startsWith("size:") ?? false
}

/**
 * @param {string[]} lines
 * @param {number} index
 * @returns {number}
 */
function skipBlankLines(lines, index) {
  while (index < lines.length && lines[index] === "") {
    index++
  }
  return index
}

/**
 * @param {string | undefined} value
 * @param {number} count
 * @returns {number[] | undefined}
 */
function parseNumbers(value, count) {
  if (!value) {
    return undefined
  }

  const values = value.split(",").map((part) => Number.parseFloat(part.trim()))
  if (values.length < count || values.slice(0, count).some((number) => !Number.isFinite(number))) {
    return undefined
  }
  return values.slice(0, count)
}

/**
 * @param {string} path
 * @returns {string}
 */
function getFileName(path) {
  const cleanPath = path.split(/[?#]/, 1)[0] ?? path
  const fileName = cleanPath.split(/[\\/]/).pop() ?? cleanPath
  return fileName.replace(/\.json$/i, "")
}

/**
 * @typedef Spine2DLoadSettings
 * @property {[string, string]} paths JSON path followed by atlas path
 * @property {string} [name]
 * @property {string} [animation]
 * @property {boolean} [generateMipmaps]
 * @property {(texture: import("../texture/index.js").Texture, pageName: string) => import("../material/index.js").RawMaterial} [createMaterial]
 */

/**
 * @typedef SpineJSON
 * @property {SpineBoneData[]} [bones]
 * @property {SpineSlotData[]} [slots]
 * @property {SpineSkinData[]} [skins]
 * @property {Record<string, SpineAnimationData>} [animations]
 */

/**
 * @typedef SpineBoneData
 * @property {string} name
 * @property {string} [parent]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [rotation]
 * @property {number} [scaleX]
 * @property {number} [scaleY]
 * @property {number} [shearX]
 * @property {number} [shearY]
 * @property {string} [transform]
 * @property {boolean} [inherit]
 */

/**
 * @typedef SpineBoneSetup
 * @property {number} x
 * @property {number} y
 * @property {number} rotation
 */

/**
 * @typedef SpineSlotData
 * @property {string} name
 * @property {string} [bone]
 * @property {string} [attachment]
 */

/**
 * @typedef SpineSkinData
 * @property {string} name
 * @property {Record<string, Record<string, SpineAttachmentData>>} attachments
 */

/**
 * @typedef SpineAttachmentData
 * @property {string} [name]
 * @property {string} [type]
 * @property {string} [path]
 * @property {number[]} [uvs]
 * @property {number[]} [vertices]
 * @property {number[]} [triangles]
 */

/**
 * @typedef SpineAnimationData
 * @property {Record<string, SpineBoneTimeline>} [bones]
 * @property {Record<string, unknown>} [slots]
 * @property {Record<string, unknown>} [deform]
 * @property {unknown} [draworder]
 * @property {unknown} [drawOrder]
 * @property {unknown} [events]
 * @property {unknown} [ik]
 * @property {unknown} [transform]
 * @property {unknown} [path]
 * @property {unknown} [physics]
 */

/**
 * @typedef SpineBoneTimeline
 * @property {SpineTimelineFrame[]} [translate]
 * @property {SpineTimelineFrame[]} [rotate]
 * @property {SpineTimelineFrame[]} [scale]
 * @property {SpineTimelineFrame[]} [shear]
 */

/**
 * @typedef SpineTimelineFrame
 * @property {number} [time]
 * @property {number} [x]
 * @property {number} [y]
 * @property {number} [value]
 * @property {number} [angle]
 * @property {"stepped" | number[]} [curve]
 */

/**
 * @typedef SpineAtlasPage
 * @property {string} name
 * @property {number} width
 * @property {number} height
 * @property {Map<string, SpineAtlasRegion>} regions
 * @property {import("../texture/index.js").Texture | undefined} texture
 */

/**
 * @typedef SpineAtlasRegion
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} rotation
 */
