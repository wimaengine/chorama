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
    const rect = this.canvas.getBoundingClientRect()
    const resized = rect.width !== this.width ||
      rect.height !== this.height

    if (resized) {
      this.width = rect.width
      this.height = rect.height
      this.canvas.width = rect.width
      this.canvas.height = rect.height
    }
    return super.changed()
  }
}
