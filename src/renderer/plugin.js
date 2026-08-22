/** @import { WebGLRenderDevice } from "../core/index.js" */
/** @import { WebGLRenderer } from "./renderer.js" */
import { abstractClass } from "../utils/index.js";

/**
 * @abstract
 */
export class Plugin {
  constructor() {
    abstractClass(this, Plugin)
  }

  /**
   * @param {WebGLRenderer} _renderer
   * @param {WebGLRenderDevice} _renderDevice
   */
  init( _renderer, _renderDevice){}
}
