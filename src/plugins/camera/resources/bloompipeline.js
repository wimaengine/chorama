/** @import { WebGLRenderDevice } from "../../../core/index.js" */
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { bloomFragment, fullscreenVertex } from "../../../shader/index.js"
import { BloomUniform } from "./bloomuniform.js"

export class BloomPipeline {
  /**
   * @type {number}
   */
  extractPipelineId

  /**
   * @type {number}
   */
  accumulatePipelineId

  /**
   * @type {number}
   */
  compositePipelineId

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  extractBindGroupLayout

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  accumulateBindGroupLayout

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  compositeBindGroupLayout

  /**
   * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  constructor(renderer, renderDevice) {
    this.extractBindGroupLayout = renderDevice.createBindGroupLayout({
      label: "BloomExtractBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "BloomBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: BloomUniform.getBindingSize(renderDevice)
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

    this.accumulateBindGroupLayout = renderDevice.createBindGroupLayout({
      label: "BloomAccumulateBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "accumTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 1,
          name: "accumTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        },
        {
          binding: 2,
          name: "bloomTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 3,
          name: "bloomTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })

    this.compositeBindGroupLayout = renderDevice.createBindGroupLayout({
      label: "BloomCompositeBindGroupLayout",
      entries: [
        {
          binding: 0,
          name: "BloomBlock",
          visibility: 0,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: BloomUniform.getBindingSize(renderDevice)
          }
        },
        {
          binding: 1,
          name: "sceneTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 2,
          name: "sceneTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        },
        {
          binding: 3,
          name: "bloomTexture",
          visibility: 0,
          texture: {
            viewDimension: "2d",
            sampleType: "float"
          }
        },
        {
          binding: 4,
          name: "bloomTexture",
          visibility: 0,
          sampler: {
            type: "filtering"
          }
        }
      ]
    })

    this.extractPipelineId = createBloomPipeline(
      renderDevice,
      renderer,
      this.extractBindGroupLayout,
      "EXTRACT_BRIGHT"
    )
    this.accumulatePipelineId = createBloomPipeline(
      renderDevice,
      renderer,
      this.accumulateBindGroupLayout,
      "ACCUMULATE_BLOOM"
    )
    this.compositePipelineId = createBloomPipeline(
      renderDevice,
      renderer,
      this.compositeBindGroupLayout,
      "COMPOSITE_BLOOM"
    )
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} bindGroupLayout
 * @param {string} define
 * @returns {number}
 */
function createBloomPipeline(device, renderer, bindGroupLayout, define) {
  const vertexShader = new Shader({
    source: fullscreenVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })
  const fragmentShader = new Shader({
    source: bloomFragment,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  fragmentShader.defines.set(define, "1")

  /**
   * @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
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

  const [pipeline, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  pipeline.layout.setBindGroupLayout(0, bindGroupLayout)
  return newId
}
