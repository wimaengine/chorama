import { clamp, Quaternion, Vector2 } from "../math/index.js"
import { OrthographicProjection } from "../objects/index.js"
import { CameraController } from "./camera.js"

/** @import { Camera } from "../objects/index.js" */

/**
 * Camera controls for 2D scenes.
 *
 * A left-button drag pans the camera, a right- or middle-button drag rotates
 * it around the Z axis, and the wheel zooms. On touch devices one finger pans
 * while a two-finger gesture pans, zooms, and rotates at the same time.
 *
 * Zoom is applied through the camera transform scale, so the controller works
 * with an orthographic projection without taking ownership of its bounds.
 */
export class PanCamera2DController extends CameraController {
  /**
   * Camera zoom multiplier. Values above one zoom in.
   * @type {number}
   */
  zoom = 1

  /** @type {number} */
  minZoom = 0.01

  /** @type {number} */
  maxZoom = 100

  /**
   * Camera rotation around the Z axis, in radians.
   * @type {number}
   */
  rotation = 0

  /**
   * Multiplier applied to the screen-to-world pan distance.
   * @type {number}
   */
  panSensitivity = 1

  /** @type {number} */
  rotationSensitivity = 0.005

  /** @type {number} */
  zoomSensitivity = 0.001

  #baseScale = new Vector2(1, 1)
  #panUnits = new Vector2()

  /**
   * @param {Camera} camera
   * @param {EventTarget} [targetElement]
   */
  constructor(camera, targetElement) {
    super(camera, targetElement)
    this.syncFromCamera()
  }

  /**
   * Synchronizes the controller with the camera's current orientation and
   * scale. Calling this resets the controller zoom to one.
   *
   * @returns {this}
   */
  syncFromCamera() {
    this.rotation = getZRotation(this.camera.transform.orientation)
    this.#baseScale.set(this.camera.transform.scale.x, this.camera.transform.scale.y)
    this.zoom = 1
    return this
  }

  /** @override */
  update() {
    this.updateMouseInput()
    this.applyCameraTransform()
  }

  /**
   * Applies the current mouse drag to the camera.
   */
  updateMouseInput() {
    const delta = this.mouseDelta

    if (this.keys.has("mouseright") || this.keys.has("mousemiddle")) {
      this.rotation += delta.x * this.rotationSensitivity
    } else if (this.keys.has("mouseleft")) {
      this.applyPanFromScreenDelta(delta.x, delta.y)
    }

    delta.set(0, 0)
  }

  /**
   * @override
   * @param {PointerEvent} event
   * @param {number} previousX
   * @param {number} previousY
   */
  onTouchMove(event, previousX, previousY) {
    if (this.touchPointers.size === 1) {
      this.applyPanFromScreenDelta(
        event.clientX - previousX,
        event.clientY - previousY
      )
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

    this.applyPanFromScreenDelta(
      currentCenterX - previousCenterX,
      currentCenterY - previousCenterY
    )

    const previousVectorX = previousP2X - previousP1X
    const previousVectorY = previousP2Y - previousP1Y
    const currentVectorX = p2.x - p1.x
    const currentVectorY = p2.y - p1.y
    const previousDistance = Math.hypot(previousVectorX, previousVectorY)
    const currentDistance = Math.hypot(currentVectorX, currentVectorY)

    if (previousDistance > 0 && currentDistance > 0) {
      this.setZoom(this.zoom * currentDistance / previousDistance)

      const previousAngle = Math.atan2(previousVectorY, previousVectorX)
      const currentAngle = Math.atan2(currentVectorY, currentVectorX)
      this.rotation += shortestAngleDelta(previousAngle, currentAngle)
    }
  }

  /**
   * @override
   * @param {WheelEvent} event
   */
  onWheel(event) {
    this.setZoom(this.zoom * Math.exp(-event.deltaY * this.zoomSensitivity))
  }

  /**
   * Sets and clamps the zoom multiplier.
   *
   * @param {number} zoom
   * @returns {this}
   */
  setZoom(zoom) {
    this.zoom = clamp(zoom, this.minZoom, this.maxZoom)
    return this
  }

  /**
   * Applies a screen-space drag to the camera position. The Y direction is
   * inverted so content follows the pointer in the viewport.
   *
   * @param {number} deltaX
   * @param {number} deltaY
   */
  applyPanFromScreenDelta(deltaX, deltaY) {
    const [unitsX, unitsY] = this.getPanUnitsPerPixel()
    const input = this.#panUnits.set(
      -deltaX * unitsX,
      deltaY * unitsY
    )
    Vector2.rotate(input, this.rotation, input)

    this.camera.transform.position.x += input.x
    this.camera.transform.position.y += input.y
  }

  /**
   * @returns {[number, number]}
   */
  getPanUnitsPerPixel() {
    const zoom = clamp(this.zoom, this.minZoom, this.maxZoom)
    this.zoom = zoom

    const projection = this.camera.projection
    const viewport = getViewportSize(this)
    const scaleX = Math.abs(this.#baseScale.x) || 1
    const scaleY = Math.abs(this.#baseScale.y) || 1

    if (projection instanceof OrthographicProjection) {
      const width = Math.abs(projection.right - projection.left)
      const height = Math.abs(projection.top - projection.bottom)

      return [
        width * scaleX / viewport[0] / zoom * this.panSensitivity,
        height * scaleY / viewport[1] / zoom * this.panSensitivity
      ]
    }

    const units = this.panSensitivity / zoom
    return [units * scaleX, units * scaleY]
  }

  applyCameraTransform() {
    this.setZoom(this.zoom)
    Quaternion.fromEuler(0, 0, this.rotation, this.camera.transform.orientation)
    this.camera.transform.scale.x = this.#baseScale.x / this.zoom
    this.camera.transform.scale.y = this.#baseScale.y / this.zoom
  }
}

/**
 * @param {PanCamera2DController} controller
 * @returns {[number, number]}
 */
function getViewportSize(controller) {
  const target = /** @type {{ clientWidth?: number, clientHeight?: number, width?: number, height?: number }} */ (controller.targetElement)
  const renderTarget = controller.camera.target
  const width = firstPositive(target.clientWidth, target.width, renderTarget?.width, 1)
  const height = firstPositive(target.clientHeight, target.height, renderTarget?.height, 1)
  return [width, height]
}

/**
 * @param {...(number | undefined)} values
 */
function firstPositive(...values) {
  for (const value of values) {
    if (value !== undefined && Number.isFinite(value) && value > 0) {
      return value
    }
  }
  return 1
}

/**
 * @param {import("hisabati").Quaternion} orientation
 */
function getZRotation(orientation) {
  return Math.atan2(
    2 * (orientation.w * orientation.z + orientation.x * orientation.y),
    1 - 2 * (orientation.y * orientation.y + orientation.z * orientation.z)
  )
}

/**
 * @param {number} from
 * @param {number} to
 */
function shortestAngleDelta(from, to) {
  let delta = to - from
  if (delta > Math.PI) delta -= Math.PI * 2
  if (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

// Keep the spelling aligned with APIs that use `2d` instead of `2D`.
export const Pan2dCameraController = PanCamera2DController
