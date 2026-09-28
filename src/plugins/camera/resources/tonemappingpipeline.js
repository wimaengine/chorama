import { TonemappingUniform } from "./tonemappinguniform.js"
import { Texture } from "../../../texture/index.js"
import { TextureFormat, TextureType } from "../../../constants/index.js"

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

  /** @readonly @type {Texture} */
  identityLut

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
      },
        {
          binding: 3,
          name: "gradingLUT",
          visibility: 0,
          texture: {
            viewDimension: "3d",
            sampleType: "float"
          }
        },
        {
          binding: 4,
          name: "gradingLUT",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })

    this.identityLut = createIdentityLut()
  }
}

function createIdentityLut() {
  const size = 2
  const data = new Uint8Array(size * size * size * 4)

  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const offset = (z * size * size + y * size + x) * 4
        data[offset] = x * 255
        data[offset + 1] = y * 255
        data[offset + 2] = z * 255
        data[offset + 3] = 255
      }
    }
  }

  return new Texture({
    type: TextureType.Texture3D,
    format: TextureFormat.RGBA8Unorm,
    width: size,
    height: size,
    depth: size,
    data: [data.buffer]
  })
}
