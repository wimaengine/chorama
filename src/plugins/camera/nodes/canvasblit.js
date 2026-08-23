/**@import { WebGLRenderDevice } from "../../../core/index.js" */
import { Camera } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { CanvasTarget } from "../../../rendertarget/index.js"
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

      const canvasSource = cameraColorTarget.target

      if (camera.target instanceof CanvasTarget && canvasSource) {
        const canvasTarget = /**@type {CanvasTarget} */ (camera.target)
        const canvasTexture = renderer.caches.getTexture(renderDevice, canvasSource)

        canvasTarget.changed()

        const pipeline = getCanvasBlitPipeline(renderDevice, renderer, pipelineState, canvasSource.format)
        const mainTextureInfo = pipeline.uniforms.get("mainTexture")
        const textureUnit = mainTextureInfo?.texture_unit
        const gpuSampler = renderer.caches.getSampler(renderDevice, renderer.defaults.textureNearestSampler)

        assert(mainTextureInfo, "Canvas blit pipeline is missing the mainTexture uniform")
        if (textureUnit === undefined) {
          throw "Canvas blit pipeline is missing a mainTexture texture unit"
        }

        const pass = renderDevice.beginRenderPass({
          width: canvasTarget.width,
          height: canvasTarget.height,
          defaultFramebuffer: true,
          colorAttachments: [{
            loadOp: "load",
            storeOp: "store"
          }],
          viewport: camera.viewport,
          scissor: camera.scissor || camera.viewport,
          depthRange: camera.depthRange
        })

        pass.setPipeline(pipeline)
        renderDevice.context.activeTexture(WebGL2RenderingContext.TEXTURE0 + textureUnit)
        renderDevice.context.bindTexture(canvasTexture.type, canvasTexture.inner)
        renderDevice.context.bindSampler(textureUnit, gpuSampler.inner)
        pass.draw(3)
        pass.end()

        cameraColorTarget.setColor(targetPool, targetPool.get({
          width: canvasTarget.width,
          height: canvasTarget.height,
          depth: 1,
          format: TextureFormat.RGBA16Float
        }))
      }

      if (view.depthTexture) {
        targetPool.recycle(view.depthTexture)
      }
    }
  }
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
  pipelineState.pipelineIds.set(format, newId)
  return pipeline
}
