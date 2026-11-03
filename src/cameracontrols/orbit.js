import { Affine3, clamp, Vector2, Vector3 } from "../math/index.js"
import { CameraController } from "./camera.js"

/** @import { Camera } from "../objects/index.js" */

export class OrbitCameraControls extends CameraController {
  elevation = 0
  azimuth = 0
  distance = 5
  minDistance = 0.01
  maxDistance = Infinity
  tideLocked = true
  offset = new Vector3()
  minElevation = -Math.PI / 2
  maxElevation = Math.PI / 2
  sensitivity = 0.02
  moveSensitivity = 0.002
  zoomSensitivity = 0.001

  /**
   * @param {Camera} camera
   * @param {EventTarget} [targetElement]
   */
  constructor(camera, targetElement) {
    super(camera, targetElement)
  }

  updateOrbit() {
    const { position, orientation } = this.camera.transform
    const { offset: target } = this
    const eye = new Vector3(
      this.distance * Math.sin(this.azimuth) * Math.cos(this.elevation),
      this.distance * Math.sin(this.elevation),
      this.distance * Math.cos(this.azimuth) * Math.cos(this.elevation)
    ).add(target)
    const initial = Affine3.lookAt(eye, target, Vector3.Y)
    const [finalPos, finalOrient, _] = initial.decompose()

    position.x = finalPos.x
    position.y = finalPos.y
    position.z = finalPos.z

    if (this.tideLocked) {
      orientation.x = finalOrient.x
      orientation.y = finalOrient.y
      orientation.z = finalOrient.z
      orientation.w = finalOrient.w
    }
  }

  updateInput() {
    const delta = this.mouseDelta
    const input = new Vector2()

    if (this.keys.has("mouseright")) {
      const temp = Vector2.set(-this.moveSensitivity, -this.moveSensitivity)
      input.add(temp.multiply(delta))
    } else if (this.keys.has("mouseleft")) {
      this.azimuth += -delta.x * this.sensitivity
      this.elevation += delta.y * this.sensitivity
      this.elevation = clamp(this.elevation, this.minElevation, this.maxElevation)
    }

    Vector2.rotate(input, -this.azimuth, input)
    this.offset.x += input.x
    this.offset.z += input.y
    this.mouseDelta.set(0, 0)
  }

  /** @override */
  update() {
    this.updateInput()
    this.updateOrbit()
  }

  /**
   * @override
   * @param {PointerEvent} _event
   * @param {number} _previousX
   * @param {number} _previousY
   */
  onTouchMove(_event, _previousX, _previousY) {
    const event = _event
    const previousX = _previousX
    const previousY = _previousY

    if (this.touchPointers.size === 1) {
      this.azimuth += -(event.clientX - previousX) * this.sensitivity
      this.elevation += (event.clientY - previousY) * this.sensitivity
      this.elevation = clamp(this.elevation, this.minElevation, this.maxElevation)
      return
    }

    if (this.touchPointers.size < 2) return

    const entries = /** @type {[[number, Vector2], [number, Vector2]]} */ ([...this.touchPointers.entries()])
    const [id1, p1] = entries[0]
    const [id2, p2] = entries[1]

    const previousP1X = id1 === event.pointerId ? previousX : p1.x
    const previousP1Y = id1 === event.pointerId ? previousY : p1.y
    const previousP2X = id2 === event.pointerId ? previousX : p2.x
    const previousP2Y = id2 === event.pointerId ? previousY : p2.y

    const previousCenterX = (previousP1X + previousP2X) * 0.5
    const previousCenterY = (previousP1Y + previousP2Y) * 0.5
    const currentCenterX = (p1.x + p2.x) * 0.5
    const currentCenterY = (p1.y + p2.y) * 0.5

    applyPanFromScreenDelta(
      this,
      currentCenterX - previousCenterX,
      currentCenterY - previousCenterY
    )

    const previousDistance = Math.hypot(previousP1X - previousP2X, previousP1Y - previousP2Y)
    const currentDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    if (previousDistance > 0 && currentDistance > 0) {
      this.distance *= previousDistance / currentDistance
      this.distance = clamp(this.distance, this.minDistance, this.maxDistance)
    }
  }

  /**
   * @override
   * @param {WheelEvent} event
   */
  onWheel(event) {
    this.distance *= Math.exp(event.deltaY * this.zoomSensitivity)
    this.distance = clamp(this.distance, this.minDistance, this.maxDistance)
  }
}

/**
 * @param {OrbitCameraControls} controls
 * @param {number} deltaX
 * @param {number} deltaY
 */
function applyPanFromScreenDelta(controls, deltaX, deltaY) {
  const input = Vector2.set(
    -controls.moveSensitivity * deltaX,
    -controls.moveSensitivity * deltaY
  )
  Vector2.rotate(input, -controls.azimuth, input)
  controls.offset.x += input.x
  controls.offset.z += input.y
}
