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
 * Marks materials that should render in the transparent pass.
 */
export class TransparentMode {}

/**
 * @typedef {OpaqueMode | AlphaMaskMode | TransparentMode} AlphaBlend
 */
