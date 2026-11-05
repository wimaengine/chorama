/**
 * Pipelines for generated-quad sprites.
 *
 * Sprite pipelines have their own shader modules and bind-group layouts. The
 * only layout they share with mesh rendering is the camera view group at 0.
 */
export class SpritePipelines {
  /**
   * @type {number | undefined}
   */
  opaque

  /**
   * @type {number | undefined}
   */
  alphaMask

  /**
   * @type {number | undefined}
   */
  transparent
}
