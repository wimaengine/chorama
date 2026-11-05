import { Vector2 } from "../math/index.js"

/** @import { Camera } from "../objects/index.js" */

/**
 * Shared input and lifecycle support for camera controllers.
 *
 * Subclasses can consume `mouseDelta`, `keys`, and `touchPointers` from their
 * `update` method. Pointer input is captured by the target element so dragging
 * continues to work when the pointer leaves the element.
 */
export class CameraController {
  #targetElement
  #windowTarget
  /** @type {EventListener} */
  #pointerdown
  /** @type {EventListener} */
  #pointerup
  /** @type {EventListener} */
  #pointermove
  /** @type {EventListener} */
  #pointercancel
  /** @type {EventListener} */
  #wheel
  /** @type {EventListener} */
  #contextmenu
  /** @type {EventListener} */
  #blur

  /** @type {Camera} */
  camera

  /** @type {EventTarget} */
  targetElement

  /** @type {Set<string>} */
  keys = new Set()

  mousePosition = new Vector2()
  mouseDelta = new Vector2()

  /** @type {Map<number, Vector2>} */
  touchPointers = new Map()

  /**
   * @param {Camera} camera
   * @param {EventTarget} [targetElement]
   */
  constructor(camera, targetElement = getDefaultTargetElement()) {
    if (!targetElement) {
      throw new Error("CameraController requires an input target element")
    }

    this.camera = camera
    this.targetElement = targetElement
    this.#targetElement = targetElement
    this.#windowTarget = typeof window === "undefined" ? undefined : window

    const styledTarget = /** @type {EventTarget & { style?: { touchAction?: string } }} */ (targetElement)
    if (styledTarget.style) {
      styledTarget.style.touchAction = "none"
    }

    this.#pointerdown = /** @type {EventListener} */ (this.handlePointerDown.bind(this))
    this.#pointerup = /** @type {EventListener} */ (this.handlePointerUp.bind(this))
    this.#pointermove = /** @type {EventListener} */ (this.handlePointerMove.bind(this))
    this.#pointercancel = /** @type {EventListener} */ (this.handlePointerCancel.bind(this))
    this.#wheel = /** @type {EventListener} */ (this.handleWheel.bind(this))
    this.#contextmenu = (/** @type {Event} */ event) => event.preventDefault()
    this.#blur = /** @type {EventListener} */ (this.handleInputCancel.bind(this))

    targetElement.addEventListener("pointerdown", this.#pointerdown)
    targetElement.addEventListener("pointerup", this.#pointerup)
    targetElement.addEventListener("pointermove", this.#pointermove)
    targetElement.addEventListener("pointercancel", this.#pointercancel)
    targetElement.addEventListener("lostpointercapture", this.#pointercancel)
    targetElement.addEventListener("wheel", this.#wheel, { passive: false })
    targetElement.addEventListener("contextmenu", this.#contextmenu)
    this.#windowTarget?.addEventListener("blur", this.#blur)
  }

  /**
   * Updates the controller. Concrete controllers override this method.
   */
  update() {}

  /**
   * Releases all event listeners owned by the controller.
   */
  dispose() {
    const targetElement = this.#targetElement
    targetElement.removeEventListener("pointerdown", this.#pointerdown)
    targetElement.removeEventListener("pointerup", this.#pointerup)
    targetElement.removeEventListener("pointermove", this.#pointermove)
    targetElement.removeEventListener("pointercancel", this.#pointercancel)
    targetElement.removeEventListener("lostpointercapture", this.#pointercancel)
    targetElement.removeEventListener("wheel", this.#wheel)
    targetElement.removeEventListener("contextmenu", this.#contextmenu)
    this.#windowTarget?.removeEventListener("blur", this.#blur)

    this.handleInputCancel()
  }

  /**
   * Hook for subclasses that need to process a mouse move.
   *
   * @param {PointerEvent} _event
   */
  onMouseMove(_event) {}

  /**
   * Hook for subclasses that need to process a touch move.
   *
   * @param {PointerEvent} _event
   * @param {number} _previousX
   * @param {number} _previousY
   */
  onTouchMove(_event, _previousX, _previousY) {}

  /**
   * Hook for subclasses that need to process a wheel event.
   *
   * @param {WheelEvent} _event
   */
  onWheel(_event) {}

  /**
   * @param {PointerEvent} event
   */
  handlePointerDown(event) {
    event.preventDefault()
    this.mousePosition.set(event.clientX, event.clientY)
    this.mouseDelta.set(0, 0)

    if (event.pointerType === "touch") {
      this.touchPointers.set(event.pointerId, new Vector2(event.clientX, event.clientY))
    }

    capturePointer(event)
    switch (event.button) {
      case 0:
        this.keys.add("mouseleft")
        break
      case 1:
        this.keys.add("mousemiddle")
        break
      case 2:
        this.keys.add("mouseright")
        break
    }
  }

  /**
   * @param {PointerEvent} event
   */
  handlePointerUp(event) {
    event.preventDefault()
    if (event.pointerType === "touch") {
      this.touchPointers.delete(event.pointerId)
    }
    releasePointer(event)
    switch (event.button) {
      case 0:
        this.keys.delete("mouseleft")
        break
      case 1:
        this.keys.delete("mousemiddle")
        break
      case 2:
        this.keys.delete("mouseright")
        break
    }
  }

  /**
   * @param {PointerEvent} event
   */
  handlePointerMove(event) {
    if (event.pointerType === "touch") {
      const pointer = this.touchPointers.get(event.pointerId)
      if (!pointer) return
      event.preventDefault()

      const previousX = pointer.x
      const previousY = pointer.y
      pointer.set(event.clientX, event.clientY)
      this.onTouchMove(event, previousX, previousY)
      return
    }

    this.mouseDelta.copy(this.mousePosition)
    this.mousePosition.set(event.clientX, event.clientY)
    this.mouseDelta.subtract(this.mousePosition).reverse()
    this.onMouseMove(event)
  }

  /**
   * @param {WheelEvent} event
   */
  handleWheel(event) {
    event.preventDefault()
    this.onWheel(event)
  }

  handlePointerCancel() {
    this.handleInputCancel()
  }

  handleInputCancel() {
    this.keys.clear()
    this.mouseDelta.set(0, 0)
    this.touchPointers.clear()
  }
}

function getDefaultTargetElement() {
  return typeof document === "undefined" ? undefined : document.body
}

/**
 * @param {PointerEvent} event
 */
function capturePointer(event) {
  const target = /** @type {{ setPointerCapture?: (pointerId: number) => void } | null} */ (event.currentTarget)
  target?.setPointerCapture?.(event.pointerId)
}

/**
 * @param {PointerEvent} event
 */
function releasePointer(event) {
  const target = /** @type {{ releasePointerCapture?: (pointerId: number) => void } | null} */ (event.currentTarget)
  target?.releasePointerCapture?.(event.pointerId)
}
