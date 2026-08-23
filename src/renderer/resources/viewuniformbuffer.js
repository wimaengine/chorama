import { UniformBuffer } from "../../core/resources/index.js"

/**
 * Shared camera data for all views in the current frame.
 *
 * `View.Blocksize` defines the fixed `CameraBlock` size up front so bind-group
 * layouts can be created early. `SortViewsNode` is the only place that writes
 * the packed payloads into the backing buffer.
 */
export class ViewUniformBuffer {
  /**
   * Backing CPU-side buffer used by the renderer's GPU cache.
   * @readonly
   * @type {UniformBuffer}
   */
  buffer = new UniformBuffer()
}
