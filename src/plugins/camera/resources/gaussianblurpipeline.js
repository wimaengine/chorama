/** @import { WebGLRenderDevice } from "../../../core/index.js" */
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { assertTrue } from "../../../utils/index.js"
import { gaussianblurFragment, fullscreenVertex } from "../../../shader/index.js"

export class GaussianBlurPipeline {
  /**
   * @type {number}
   */
  tapCount

  /**
   * @type {number}
   */
  horizontalPipelineId

  /**
   * @type {number}
   */
  verticalPipelineId

  /**
   * @readonly
   * @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout}
   */
  bindGroupLayout

  /**
   * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   * @param {{ tapCount?: number }} [options]
   */
  constructor(renderer, renderDevice, { tapCount = 5 } = {}) {
    assertTrue(
      Number.isInteger(tapCount) && tapCount >= 1 && tapCount % 2 === 1,
      `Gaussian blur tap count must be an odd positive integer, got ${tapCount}`
    )

    this.tapCount = tapCount

    this.bindGroupLayout = renderDevice.createBindGroupLayout({
      label: "GaussianBlurBindGroupLayout",
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

    this.horizontalPipelineId = createGaussianBlurPipeline(
      renderDevice,
      renderer,
      this.bindGroupLayout,
      "HORIZONTAL_BLUR",
      this.tapCount
    )
    this.verticalPipelineId = createGaussianBlurPipeline(
      renderDevice,
      renderer,
      this.bindGroupLayout,
      "VERTICAL_BLUR",
      this.tapCount
    )
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} bindGroupLayout
 * @param {string} define
 * @param {number} tapCount
 * @returns {number}
 */
function createGaussianBlurPipeline(device, renderer, bindGroupLayout, define, tapCount) {
  const vertexShader = new Shader({
    source: fullscreenVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })
  const fragmentShader = new Shader({
    source: gaussianblurFragment,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  fragmentShader.defines.set(define, "1")
  fragmentShader.defines.set("BLUR_TAPS", String(tapCount))

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
