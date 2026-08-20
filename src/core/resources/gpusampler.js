export class GPUSampler {
  /**
   * @type {WebGL2RenderingContext}
   */
  #context

  /**
   * @type {boolean}
   */
  #destroyed = false

  /**
   * @readonly
   * @type {WebGLSampler}
   */
  inner

  /**
   * @readonly
   * @type {"filtering" | "comparison"}
   */
  type

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLSampler} sampler
   * @param {"filtering" | "comparison"} type
   */
  constructor(context, sampler, type) {
    this.#context = context
    this.inner = sampler
    this.type = type
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#context.deleteSampler(this.inner)
    this.#destroyed = true
  }
}
