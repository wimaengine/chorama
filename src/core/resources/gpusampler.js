export class GPUSampler {
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
   * @param {WebGLSampler} sampler
   * @param {"filtering" | "comparison"} type
   */
  constructor(sampler, type) {
    this.inner = sampler
    this.type = type
  }
}
