/** @import { WebGLRenderDevice } from "../../../core/index.js" */
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { snapUp } from "../../../math/index.js"
import { View } from "../../../renderer/index.js"
import { fogFragment, fullscreenVertex } from "../../../shader/index.js"
import { FogUniform } from "./foguniform.js"

export class FogPipeline {
  /**
   * @type {number}
   */
  pipelineId

  /**
   * Aligned size of one camera block in the shared fog bind group.
   * @type {number}
   */
  cameraBindingSize

  /**
   * Aligned size of one fog block in the shared fog bind group.
   * @type {number}
   */
  fogBindingSize

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  bindGroupLayout

  /**
   * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  constructor(renderer, renderDevice) {
    this.cameraBindingSize = snapUp(
      View.BlockSize,
      renderDevice.limits.minUniformBufferOffsetAlignment
    )
    this.fogBindingSize = snapUp(
      FogUniform.BlockSize,
      renderDevice.limits.minUniformBufferOffsetAlignment
    )

    this.bindGroupLayout = renderDevice.createBindGroupLayout({
      label: "FogBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "CameraBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: this.cameraBindingSize
          }
        },
        {
          binding: 1,
          name: "FogBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: this.fogBindingSize
          }
        },
        {
          binding: 2,
          name: "sceneTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 3,
          name: "sceneTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        },
        {
          binding: 4,
          name: "depthTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "depth"
          }
        },
        {
          binding: 5,
          name: "depthTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })

    this.pipelineId = createFogPipeline(renderDevice, renderer, this.bindGroupLayout)
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} bindGroupLayout
 * @returns {number}
 */
function createFogPipeline(device, renderer, bindGroupLayout) {
  const vertexShader = new Shader({
    source: fullscreenVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })
  const fragmentShader = new Shader({
    source: fogFragment,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  /**
   * @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    }),
    depthWrite: false,
    depthCompare: CompareFunction.Always,
    cullFace: CullFace.None,
    topology: PrimitiveTopology.Triangles,
    vertexLayout: new MeshVertexLayout([]),
    vertex: device.createShaderModule({
      code: vertexShader.compile(),
      stage: "vertex"
    }),
    fragment: {
      source: device.createShaderModule({
        code: fragmentShader.compile(),
        stage: "fragment"
      }),
      targets: [{
        format: TextureFormat.RGBA16Float
      }]
    }
  }

  const [, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  return newId
}
