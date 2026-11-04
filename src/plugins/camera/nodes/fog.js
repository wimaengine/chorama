import { Camera } from "../../../objects/index.js"
import { Views } from "../../../renderer/index.js"
import { ViewUniformBuffer } from "../../../renderer/resources/index.js"
import { assert } from "../../../utils/index.js"
import { CameraColorTargets } from "../resources/index.js"
import { FogPipeline, FogUniform } from "../resources/index.js"

/**
 * Fog postprocess node.
 */
export class FogNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const colorTargets = renderer.getResource(CameraColorTargets)
    const pipelineState = renderer.getResource(FogPipeline)
    const fogUniform = renderer.getResource(FogUniform)
    const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)

    assert(views, "Views resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(pipelineState, "FogPipeline resource missing")
    assert(fogUniform, "FogUniform resource missing")
    assert(viewUniformBuffer, "ViewUniformBuffer resource missing")

    const commandEncoder = renderDevice.createCommandEncoder()
    const actualViews = views.items()
    const pipeline = renderer.caches.getRenderPipeline(pipelineState.pipelineId)
    const cameraBuffer = renderer.caches.getUniformBuffer(renderDevice, viewUniformBuffer.buffer)
    const fogBuffer = renderer.caches.getUniformBuffer(renderDevice, fogUniform.buffer)

    assert(pipeline, "Fog pipeline missing")

    for (let viewIndex = 0; viewIndex < actualViews.length; viewIndex++) {
      const view = /** @type {import("../../../renderer/core/index.js").View} */ (actualViews[viewIndex])

      if (!(view.object instanceof Camera)) {
        continue
      }

      const fog = view.object.fog
      if (!fog) {
        continue
      }

      const cameraColorTarget = colorTargets.get(view.object)
      if (!cameraColorTarget) {
        continue
      }

      const sourceColor = cameraColorTarget.readTarget
      const depthTexture = view.depthTexture ? renderer.caches.getTexture(renderDevice, view.depthTexture) : undefined

      if (!depthTexture) {
        continue
      }

      const sourceTexture = renderer.caches.getTexture(renderDevice, sourceColor)
      const sampler = renderer.caches.getSampler(renderDevice, renderer.defaults.textureNearestSampler)
      const cameraDynamicOffset = viewIndex * pipelineState.cameraBindingSize
      const fogDynamicOffset = fogUniform.getOffset(view.object)

      if (fogDynamicOffset === undefined) {
        continue
      }

      const bindGroup = createFogBindGroup(
        renderDevice,
        pipelineState,
        cameraBuffer,
        fogBuffer,
        sourceTexture,
        depthTexture,
        sampler
      )

      const [, outputColor] = cameraColorTarget.getColorPair()

      const pass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          texture: renderer.caches.getTexture(renderDevice, outputColor),
          layer: 0,
          loadOp: "load",
          storeOp: "store"
        }]
      })

      pass.setPipeline(pipeline)
      pass.setBindGroup(0, bindGroup, [cameraDynamicOffset, fogDynamicOffset])
      pass.draw(3)
      pass.end()
    }
  }
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {FogPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUBuffer} cameraBuffer
 * @param {import("../../../core/resources/index.js").GPUBuffer} fogBuffer
 * @param {import("../../../core/resources/index.js").GPUTexture} sceneTexture
 * @param {import("../../../core/resources/index.js").GPUTexture} depthTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} sampler
 */
function createFogBindGroup(device, pipelineState, cameraBuffer, fogBuffer, sceneTexture, depthTexture, sampler) {
  return device.createBindGroup({
    label: "FogBindGroup",
    layout: pipelineState.bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: cameraBuffer,
          size: pipelineState.cameraBindingSize
        }
      },
      {
        binding: 1,
        resource: {
          buffer: fogBuffer,
          size: pipelineState.fogBindingSize
        }
      },
      {
        binding: 2,
        resource: {
          texture: sceneTexture
        }
      },
      {
        binding: 3,
        resource: {
          sampler
        }
      },
      {
        binding: 4,
        resource: {
          texture: depthTexture
        }
      },
      {
        binding: 5,
        resource: {
          sampler
        }
      }
    ]
  })
}
