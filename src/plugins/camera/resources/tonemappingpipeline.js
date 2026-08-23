import { TonemappingUniform } from "./tonemappinguniform.js"

export class TonemappingPipeline {
  /**
   * @type {Map<string, number>}
   */
  pipelineIds = new Map()

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  bindGroupLayout

  /**
   * @param {import("../../../core/index.js").WebGLRenderDevice} renderDevice
   */
  constructor(renderDevice) {
    const bindingSize = TonemappingUniform.getBindingSize(renderDevice)

    this.bindGroupLayout = renderDevice.createBindGroupLayout({
      label: "TonemappingBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "TonemappingBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: bindingSize
          }
        },
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
