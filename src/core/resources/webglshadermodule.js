/**
 * WebGPU-shaped shader module wrapper for WebGL render pipeline setup.
 *
 * The module owns a compiled WebGLShader and keeps the WebGL context that
 * created it so the resource behaves like the other GPU-side wrappers.
 */
export class WebGLShaderModule {
  /**
   * @type {boolean}
   */
  #destroyed = false

  /**
   * @type {WebGL2RenderingContext}
   */
  #context

  /**
   * @readonly
   * @type {WebGLShader}
   */
  inner

  /**
   * @readonly
   * @type {"vertex" | "fragment"}
   */
  stage

  /**
   * @readonly
   * @type {string | undefined}
   */
  label

  /**
   * @param {WebGL2RenderingContext} context
   * @param {WebGLShader} inner
   * @param {"vertex" | "fragment"} stage
   * @param {string} [label]
   */
  constructor(context, inner, stage, label) {
    this.#context = context
    this.inner = inner
    this.stage = stage
    this.label = label
  }

  destroy() {
    if (this.#destroyed) {
      return
    }

    this.#context.deleteShader(this.inner)
    this.#destroyed = true
  }
}

