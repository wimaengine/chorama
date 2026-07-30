import { RenderTarget } from "./rendertarget.js";

export class CanvasTarget extends RenderTarget {
  /**
   * @readonly
   * @type {HTMLCanvasElement}
   */
  canvas
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    super(canvas.width, canvas.height, 1)
    this.canvas = canvas
  }

  /**
   * @override
   */
  changed() {
    // TODO:Use client bounding rect instead of this.
    const resized = this.canvas.width !== this.width ||
      this.canvas.height !== this.height

    if (resized) {
      this.width = this.canvas.width
      this.height = this.canvas.height
    }
    return super.changed()
  }
}