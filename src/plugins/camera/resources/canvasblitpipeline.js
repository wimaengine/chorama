/** @import { WebGLRenderDevice } from "../../../core/index.js" */

export class CanvasBlitPipeline {
  /**
   * @type {Map<number, number>}
   */
  pipelineIds = new Map()

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  bindGroupLayout

  /**
   * @param {WebGLRenderDevice} renderDevice
   */
  constructor(renderDevice) {
    this.bindGroupLayout = renderDevice.createBindGroupLayout({
      label: "CanvasBlitBindGroupLayout",
      entries: [
        {
          binding: 1,
          name: "mainTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 2,
          name: "mainTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })
  }
}
