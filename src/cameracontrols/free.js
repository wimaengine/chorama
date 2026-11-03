import { clamp, Quaternion, Vector3 } from "../math/index.js"
import { CameraController } from "./camera.js"

/** @import { Camera } from "../objects/index.js" */

const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight"
])

export class FreeCameraController extends CameraController {
  yaw = 0
  pitch = 0
  minPitch = -Math.PI / 2 + 0.0001
  maxPitch = Math.PI / 2 - 0.0001
  sensitivity = 0.002
  movementSpeed = 5
  sprintMultiplier = 2

  #keyboardTarget
  /** @type {EventListener} */
  #keydown
  /** @type {EventListener} */
  #keyup
  #forward = new Vector3(0, 0, -1)
  #right = new Vector3(1, 0, 0)
  #up = new Vector3(0, 1, 0)
  #movement = new Vector3()

  /**
   * @param {Camera} camera
   * @param {EventTarget} [targetElement]
   * @param {EventTarget} [keyboardTarget]
   */
  constructor(camera, targetElement, keyboardTarget = getDefaultKeyboardTarget(targetElement)) {
    super(camera, targetElement)
    this.#keyboardTarget = keyboardTarget ?? this.targetElement
    this.#keydown = /** @type {EventListener} */ (keyDown.bind(this))
    this.#keyup = /** @type {EventListener} */ (keyUp.bind(this))
    this.#keyboardTarget.addEventListener("keydown", this.#keydown)
    this.#keyboardTarget.addEventListener("keyup", this.#keyup)
    this.syncFromCamera()
  }

  /**
   * Synchronizes yaw and pitch with the camera's current orientation.
   *
   * This is useful when another system changes the camera orientation before
   * handing control to this controller.
   *
   * @returns {this}
   */
  syncFromCamera() {
    const forward = Quaternion.transformVector3(
      this.camera.transform.orientation,
      this.#forward.set(0, 0, -1)
    ).normalize()
    this.yaw = Math.atan2(-forward.x, -forward.z)
    this.pitch = clamp(Math.asin(clamp(forward.y, -1, 1)), this.minPitch, this.maxPitch)
    return this
  }

  /** @override */
  update(deltaTime = 1 / 60) {
    const elapsed = Math.max(0, deltaTime)
    this.updateLook()
    this.updateMovement(elapsed)
  }

  updateLook() {
    if (this.keys.has("mouseleft")) {
      this.yaw -= this.mouseDelta.x * this.sensitivity
      this.pitch += this.mouseDelta.y * this.sensitivity
      this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch)
    }
    this.mouseDelta.set(0, 0)

    Quaternion.fromEuler(this.pitch, this.yaw, 0, this.camera.transform.orientation)
  }

  /**
   * @override
   * @param {PointerEvent} event
   * @param {number} previousX
   * @param {number} previousY
   */
  onTouchMove(event, previousX, previousY) {
    if (this.touchPointers.size !== 1) return
    this.yaw -= (event.clientX - previousX) * this.sensitivity
    this.pitch += (event.clientY - previousY) * this.sensitivity
    this.pitch = clamp(this.pitch, this.minPitch, this.maxPitch)
  }

  /**
   * @param {number} deltaTime
   */
  updateMovement(deltaTime) {
    this.#movement.set(0, 0, 0)
    const orientation = this.camera.transform.orientation

    Quaternion.transformVector3(orientation, this.#forward.set(0, 0, -1))
    Quaternion.transformVector3(orientation, this.#right.set(1, 0, 0))
    Quaternion.transformVector3(orientation, this.#up.set(0, 1, 0))

    if (hasKey(this.keys, "KeyW", "ArrowUp")) this.#movement.add(this.#forward)
    if (hasKey(this.keys, "KeyS", "ArrowDown")) this.#movement.subtract(this.#forward)
    if (hasKey(this.keys, "KeyD", "ArrowRight")) this.#movement.add(this.#right)
    if (hasKey(this.keys, "KeyA", "ArrowLeft")) this.#movement.subtract(this.#right)
    if (hasKey(this.keys, "KeyE", "Space")) this.#movement.add(this.#up)
    if (hasKey(this.keys, "KeyQ", "ControlLeft", "ControlRight")) this.#movement.subtract(this.#up)

    const magnitude = this.#movement.magnitude()
    if (magnitude === 0) return

    const speed = this.movementSpeed * (
      hasKey(this.keys, "ShiftLeft", "ShiftRight") ? this.sprintMultiplier : 1
    )
    this.#movement
      .divideScalar(magnitude)
      .multiplyScalar(speed * deltaTime)
    this.camera.transform.position.add(this.#movement)
  }

  /** @override */
  dispose() {
    this.#keyboardTarget.removeEventListener("keydown", this.#keydown)
    this.#keyboardTarget.removeEventListener("keyup", this.#keyup)
    super.dispose()
  }
}

/**
 * @param {Set<string>} keys
 * @param {...string} candidates
 */
function hasKey(keys, ...candidates) {
  return candidates.some((key) => keys.has(key))
}

/**
 * @param {KeyboardEvent} event
 */
function normalizeKey(event) {
  if (movementKeys.has(event.code)) return event.code

  switch (event.key.toLowerCase()) {
    case "w": return "KeyW"
    case "a": return "KeyA"
    case "s": return "KeyS"
    case "d": return "KeyD"
    case "q": return "KeyQ"
    case "e": return "KeyE"
    case "arrowup": return "ArrowUp"
    case "arrowdown": return "ArrowDown"
    case "arrowleft": return "ArrowLeft"
    case "arrowright": return "ArrowRight"
    case " ":
    case "space":
    case "spacebar": return "Space"
    case "shift": return "ShiftLeft"
    case "control":
    case "ctrl": return "ControlLeft"
    default: return undefined
  }
}

/**
 * @this {FreeCameraController}
 * @param {KeyboardEvent} event
 */
function keyDown(event) {
  const key = normalizeKey(event)
  if (!key) return
  event.preventDefault()
  this.keys.add(key)
}

/**
 * @this {FreeCameraController}
 * @param {KeyboardEvent} event
 */
function keyUp(event) {
  const key = normalizeKey(event)
  if (!key) return
  event.preventDefault()
  this.keys.delete(key)
}

/**
 * @param {EventTarget | undefined} targetElement
 */
function getDefaultKeyboardTarget(targetElement) {
  return typeof window === "undefined" ? targetElement : window
}
