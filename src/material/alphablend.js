export class OpaqueMode {}

export class AlphaMaskMode {
  /**
   * @type {number}
   */
  cutoff

  constructor(cutoff = 0.5) {
    this.cutoff = cutoff
  }
}

/**
 * @typedef {OpaqueMode | AlphaMaskMode} AlphaBlend
 */
