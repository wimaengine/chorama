/** @import { Object3D } from "../../objects/index.js" */
/** @import { WebGLRenderDevice } from "../../core/index.js" */
import { ViewBindGroup } from "./viewbindgroup.js"

/**
 * Per-object scene bind-group cache.
 *
 * Each view resolves its source object to a cached SceneBindGroup instance.
 */
export class ViewBindGroups {
  /**
   * @type {WeakMap<Object3D, ViewBindGroup>}
   */
  #groups = new WeakMap()

  /**
   * Returns the cached scene bind group for an object, creating it if needed.
   *
   * @param {WebGLRenderDevice} device
   * @param {Object3D} object
   * @returns {ViewBindGroup}
   */
  getOrSet(device, object) {
    const existing = this.#groups.get(object)

    if (existing) {
      existing.update(device)
      return existing
    }

    const sceneBindGroup = new ViewBindGroup()
    sceneBindGroup.update(device)
    this.#groups.set(object, sceneBindGroup)
    return sceneBindGroup
  }

  /**
   * Returns the cached scene bind group for an object, if any.
   *
   * @param {Object3D} object
   * @returns {ViewBindGroup | undefined}
   */
  get(object) {
    return this.#groups.get(object)
  }
}
