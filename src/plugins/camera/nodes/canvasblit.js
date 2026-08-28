/**@import { WebGLRenderDevice } from "../../../core/index.js" */
import { Camera } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { CanvasTarget, ImageRenderTarget } from "../../../rendertarget/index.js"
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { assert } from "../../../utils/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { CameraColorTargets, CanvasBlitPipeline } from "../resources/index.js"
import { blitFragment, fullscreenVertex } from "../../../shader/index.js"

export class CanvasBlitNode {
  subgraph() {
    return undefined
  }
  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const targetPool = renderer.getResource(Texture2DPool)
    const colorTargets = renderer.getResource(CameraColorTargets)
    const pipelineState = renderer.getResource(CanvasBlitPipeline)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(pipelineState, "CanvasBlitPipeline resource missing")
    const commandEncoder = renderDevice.createCommandEncoder()

    const actualViews = views.items()

    for (let i = 0; i < actualViews.length; i++) {
      const view = /**@type {View} */(actualViews[i])

      if (!(view.object instanceof Camera)) {
        continue
      }

      const camera = view.object
      const cameraColorTarget = colorTargets.get(camera)
      if (!cameraColorTarget) {
        continue
      }

      const canvasSource = cameraColorTarget.readTarget

      const sourceTexture = renderer.caches.getTexture(renderDevice, canvasSource)
      const gpuSampler = renderer.caches.getSampler(renderDevice, renderer.defaults.textureNearestSampler)
      const bindGroup = createCanvasBlitBindGroup(renderDevice, pipelineState, sourceTexture, gpuSampler)

      const cameraTarget = camera.target

      if (cameraTarget instanceof CanvasTarget) {
        const canvasTarget = /**@type {CanvasTarget} */ (camera.target)

        canvasTarget.changed()

        const pipeline = getCanvasBlitPipeline(renderDevice, renderer, pipelineState, canvasSource.format)

        const pass = commandEncoder.beginRenderPass({
          width: canvasTarget.width,
          height: canvasTarget.height,
          defaultFramebuffer: true,
          colorAttachments: [{
            loadOp: "load",
            storeOp: "store"
          }],
          viewport: view.viewport,
          scissor: view.scissor || view.viewport,
          depthRange: view.depthRange
        })

        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(3)
        pass.end()
      } else if (cameraTarget instanceof ImageRenderTarget) {
        const imageTarget = /**@type {ImageRenderTarget} */ (cameraTarget)
        const imageTexture = renderer.caches.getTexture(renderDevice, imageTarget.image)

        const pipeline = getCanvasBlitPipeline(renderDevice, renderer, pipelineState, imageTarget.image.format)

        const pass = commandEncoder.beginRenderPass({
          width: imageTarget.width,
          height: imageTarget.height,
          colorAttachments: [{
            texture: imageTexture,
            mipLevel: view.colorMipmapLevel,
            layer: view.colorLayer,
            loadOp: "load",
            storeOp: "store"
          }],
          viewport: view.viewport,
          scissor: view.scissor || view.viewport,
          depthRange: view.depthRange
        })

        pass.setPipeline(pipeline)
        pass.setBindGroup(0, bindGroup)
        pass.draw(3)
        pass.end()
      }

      if (view.depthTexture) {
        targetPool.recycle(view.depthTexture)
      }
    }
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {CanvasBlitPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUTexture} sourceTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} gpuSampler
 */
function createCanvasBlitBindGroup(device, pipelineState, sourceTexture, gpuSampler) {
  return device.createBindGroup({
    label: "CanvasBlitBindGroup",
    layout: pipelineState.bindGroupLayout,
    entries: [
      {
        binding: 1,
        resource: {
          texture: sourceTexture
        }
      },
      {
        binding: 2,
        resource: {
          sampler: gpuSampler
        }
      }
    ]
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {CanvasBlitPipeline} pipelineState
 * @param {TextureFormat} format
 */
function getCanvasBlitPipeline(device, renderer, pipelineState, format) {
  const pipelineId = pipelineState.pipelineIds.get(format)

  if (pipelineId !== undefined) {
    const pipeline = renderer.caches.getRenderPipeline(pipelineId)
    if (pipeline) {
      return pipeline
    }
    pipelineState.pipelineIds.delete(format)
  }

  const vertexShader = new Shader({
    source: fullscreenVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })
  const fragmentShader = new Shader({
    source: blitFragment,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

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
        format
      }]
    }
  }


  const [pipeline, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  pipeline.layout.setBindGroupLayout(0, pipelineState.bindGroupLayout)
  pipelineState.pipelineIds.set(format, newId)
  return pipeline
}
