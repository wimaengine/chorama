import { Object2D, Object3D, ObjectBase } from "../objects/index.js"
import { AnimationClip } from "./clip.js"
import { Playback } from "./playback.js"
import { PlaybackRepeat } from "./repeat.js"

export class AnimationPlayer extends ObjectBase {
  /**
   * @type {Map<AnimationClip, Playback>}
   */
  animations = new Map()

  /**
   * @type {Map<string, AnimationClip>}
   */
  clipsByName = new Map()

  /**
   * @param {Map<AnimationClip, Playback>} [animations]
   */
  constructor(animations) {
    super()

    if (animations) {
      this.animations = animations
    }
  }

  /**
   * @param {this} object
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   * @returns {this}
   * @override
   */
  copy(object, entityMap) {
    super.copy(object, entityMap)

    this.animations.clear()
    object.animations.forEach((playback, clip) => {
      this.animations.set(clip, playback.clone())
    })

    this.clipsByName.clear()
    object.clipsByName.forEach((clip, name) => {
      this.clipsByName.set(name, clip)
    })

    return this
  }

  /**
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   * @returns {this}
   * @override
   */
  clone(entityMap) {
    return super.clone(entityMap)
  }

  /**
   * Registers a playback for a clip.
   *
   * @param {AnimationClip} clip
   * @param {import("./playback.js").PlaybackSettings} [settings]
   * @returns {this}
   */
  set(clip, settings = {}) {
    const duration = Math.min(settings.duration ?? Number.MAX_SAFE_INTEGER, clip.duration)
    const playback = new Playback({
      duration,
      speed: settings.speed,
      repeatMode: settings.repeatMode ?? PlaybackRepeat.None
    })

    this.animations.set(clip, playback)
    return this
  }

  /**
   * @param {AnimationClip} clip
   * @returns {Playback | undefined}
   */
  get(clip) {
    return this.animations.get(clip)
  }

  /**
   * @param {AnimationClip} clip
   * @returns {boolean}
   */
  has(clip) {
    return this.animations.has(clip)
  }

  /**
   * @param {AnimationClip} clip
   * @returns {boolean}
   */
  delete(clip) {
    const deleted = this.animations.delete(clip)

    if (!deleted) {
      return false
    }

    this.clipsByName.forEach((namedClip, name) => {
      if (namedClip === clip) {
        this.clipsByName.delete(name)
      }
    })

    return true
  }

  /**
   * @returns {this}
   */
  clear() {
    this.animations.clear()
    this.clipsByName.clear()
    return this
  }

  /**
   * @param {AnimationClip} clip
   * @returns {this}
   */
  start(clip) {
    this.get(clip)?.start()
    return this
  }

  /**
   * @param {AnimationClip} clip
   * @returns {this}
   */
  stop(clip) {
    this.get(clip)?.stop()
    return this
  }

  /**
   * @param {AnimationClip} clip
   * @returns {this}
   */
  play(clip) {
    this.get(clip)?.play()
    return this
  }

  /**
   * @param {AnimationClip} clip
   * @returns {this}
   */
  pause(clip) {
    this.get(clip)?.pause()
    return this
  }

  /**
   * @returns {this}
   */
  startAll() {
    this.animations.forEach((playback) => playback.start())
    return this
  }

  /**
   * @returns {this}
   */
  stopAll() {
    this.animations.forEach((playback) => playback.stop())
    return this
  }

  /**
   * @returns {this}
   */
  playAll() {
    this.animations.forEach((playback) => playback.play())
    return this
  }

  /**
   * @returns {this}
   */
  pauseAll() {
    this.animations.forEach((playback) => playback.pause())
    return this
  }

  /**
   * Advances all registered playbacks.
   *
   * @param {number} delta
   * @returns {this}
   */
  advance(delta) {
    if (this.animations.size === 0) {
      return this
    }

    this.animations.forEach((playback) => {
      playback.update(delta)
    })

    return this
  }

  /**
   * Applies the current playback states to matching objects in the parent subtree.
   *
   * @returns {this}
   */
  apply() {
    if (this.animations.size === 0) {
      return this
    }

    const targetsByName = /** @type {Map<string, ObjectBase[]>} */ (new Map())
    const targetRoot = this.parent ?? this
    targetRoot.traverseDFS((object) => {
      if (object.name.length > 0) {
        const matches = targetsByName.get(object.name)

        if (matches) {
          matches.push(object)
        } else {
          targetsByName.set(object.name, [object])
        }
      }

      return true
    })

    this.animations.forEach((playback, clip) => {
      if (playback.paused) {
        return
      }

      clip.tracks.forEach((tracks, targetName) => {
        if (targetName.length === 0) {
          return
        }

        const targets = targetsByName.get(targetName)
        if (!targets) {
          return
        }

        for (let j = 0; j < tracks.length; j++) {
          const track = /** @type {import("./track.js").AnimationTrack} */ (tracks[j])
          const values = track.getCurrent(playback.elapsed)

          if (!values) {
            continue
          }

          for (let i = 0; i < targets.length; i++) {
            const target = /** @type {ObjectBase} */ (targets[i])
            track.apply(target, values)
          }
        }
      })
    })

    this.traverseDFS((object) => {
      if (object instanceof Object2D || object instanceof Object3D) {
        object.update()
      }
      return true
    })

    return this
  }

  /**
   * Advances and applies all registered animations.
   *
   * @param {number} delta
   * @returns {this}
   */
  animate(delta) {
    this.advance(delta)
    this.apply()

    return this
  }
}
