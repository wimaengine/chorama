export class PrePassPipeline {
  /** @type {WeakMap<object, Map<string, number>>} */
  #pipelines = new WeakMap()

  /**
   * @param {object} layout
   * @param {string} key
   * @returns {number | undefined}
   */
  get(layout, key) {
    return this.#pipelines.get(layout)?.get(key)
  }

  /**
   * @param {object} layout
   * @param {string} key
   * @param {number} pipelineId
   */
  set(layout, key, pipelineId) {
    let layoutPipelines = this.#pipelines.get(layout)

    if (!layoutPipelines) {
      layoutPipelines = new Map()
      this.#pipelines.set(layout, layoutPipelines)
    }

    layoutPipelines.set(key, pipelineId)
  }

  /**
   * @param {object} layout
   * @param {string} key
   * @param {() => number} compute
   * @returns {number}
   */
  getOrSetCompute(layout, key, compute) {
    const pipelineId = this.get(layout, key)

    if (pipelineId !== undefined) {
      return pipelineId
    }

    const newPipelineId = compute()
    this.set(layout, key, newPipelineId)
    return newPipelineId
  }
}
