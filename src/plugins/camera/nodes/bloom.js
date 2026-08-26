/**@import { WebGLRenderDevice } from "../../../core/index.js" */
import { Camera } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { TextureFormat } from "../../../constants/index.js"
import { assert } from "../../../utils/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { BloomPipeline, BloomUniform, CameraColorTargets, GaussianBlurPipeline } from "../resources/index.js"

const BLOOM_PYRAMID_LEVELS = 5

export class BloomNode {
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
    const bloomPipelineState = renderer.getResource(BloomPipeline)
    const blurPipelineState = renderer.getResource(GaussianBlurPipeline)
    const bloomUniform = renderer.getResource(BloomUniform)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(bloomPipelineState, "BloomPipeline resource missing")
    assert(blurPipelineState, "GaussianBlurPipeline resource missing")
    assert(bloomUniform, "BloomUniform resource missing")

    const actualViews = views.items()
    let bloomIndex = 0

    for (let i = 0; i < actualViews.length; i++) {
      const view = /**@type {View} */(actualViews[i])

      if (!(view.object instanceof Camera)) {
        continue
      }

      /** @type {import("../resources/index.js").CameraColorTarget | undefined} */
      const cameraColorTarget = colorTargets.get(view.object)
      assert(cameraColorTarget, "Camera color target missing")

      const sourceColor = cameraColorTarget.target
      if (!sourceColor) {
        continue
      }

      const bloom = view.object.bloom
      if (!bloom) {
        continue
      }

      const sourceTexture = renderer.caches.getTexture(renderDevice, sourceColor)
      const sampler = renderer.caches.getSampler(renderDevice, renderer.defaults.textureSampler)
      const bloomOffset = bloomUniform.setBloom(bloomIndex, bloom)
      const bloomBuffer = renderer.caches.getUniformBuffer(renderDevice, bloomUniform.buffer)
      const extractPipeline = renderer.caches.getRenderPipeline(bloomPipelineState.extractPipelineId)
      const accumulatePipeline = renderer.caches.getRenderPipeline(bloomPipelineState.accumulatePipelineId)
      const compositePipeline = renderer.caches.getRenderPipeline(bloomPipelineState.compositePipelineId)
      const horizontalBlurPipeline = renderer.caches.getRenderPipeline(blurPipelineState.horizontalPipelineId)
      const verticalBlurPipeline = renderer.caches.getRenderPipeline(blurPipelineState.verticalPipelineId)

      assert(extractPipeline, "Bloom extract pipeline missing")
      assert(accumulatePipeline, "Bloom accumulate pipeline missing")
      assert(compositePipeline, "Bloom composite pipeline missing")
      assert(horizontalBlurPipeline, "Bloom horizontal blur pipeline missing")
      assert(verticalBlurPipeline, "Bloom vertical blur pipeline missing")

      const bloomLevels = createBloomPyramid(targetPool, sourceColor)
      const temporaryTextures = []

      for (const level of bloomLevels) {
        temporaryTextures.push(level.texture)

        if (level.pingTexture) {
          temporaryTextures.push(level.pingTexture)
        }
      }

      const fullResDescriptor = createBloomTextureDescriptor(sourceColor.width, sourceColor.height)
      const outputColor = targetPool.get(fullResDescriptor)

      const firstLevel = bloomLevels[0]
      assert(firstLevel, "Bloom pyramid base level missing")
      renderFullscreenPass(
        renderDevice,
        renderer.caches.getTexture(renderDevice, firstLevel.texture),
        extractPipeline,
        createExtractBindGroup(
          renderDevice,
          bloomPipelineState,
          bloomBuffer,
          bloomUniform.bindingSize,
          sourceTexture,
          sampler
        ),
        [bloomOffset]
      )

      let sourceLevelTexture = firstLevel.texture

      for (let levelIndex = 1; levelIndex < bloomLevels.length; levelIndex++) {
        const level = bloomLevels[levelIndex]
        assert(level, "Bloom pyramid level missing")
        assert(level.pingTexture, "Bloom pyramid ping texture missing")
        const sourceLevelGpuTexture = renderer.caches.getTexture(renderDevice, sourceLevelTexture)
        const pingLevelGpuTexture = renderer.caches.getTexture(renderDevice, level.pingTexture)
        const levelGpuTexture = renderer.caches.getTexture(renderDevice, level.texture)

        renderFullscreenPass(
          renderDevice,
          pingLevelGpuTexture,
          horizontalBlurPipeline,
          createBlurBindGroup(renderDevice, blurPipelineState, sourceLevelGpuTexture, sampler)
        )

        renderFullscreenPass(
          renderDevice,
          levelGpuTexture,
          verticalBlurPipeline,
          createBlurBindGroup(renderDevice, blurPipelineState, pingLevelGpuTexture, sampler)
        )

        sourceLevelTexture = level.texture
      }

      const accumulationTexture = targetPool.get(fullResDescriptor)
      temporaryTextures.push(accumulationTexture)
      clearTexture(renderDevice, renderer.caches.getTexture(renderDevice, accumulationTexture))

      // Fold every pyramid level through the same accumulator, including the base level.
      let accumulationSourceTexture = accumulationTexture
      let accumulationTargetTexture = firstLevel.texture

      for (let levelIndex = 0; levelIndex < bloomLevels.length; levelIndex++) {
        const level = bloomLevels[levelIndex]
        assert(level, "Bloom pyramid level missing")
        const accumulationSourceGpuTexture = renderer.caches.getTexture(renderDevice, accumulationSourceTexture)
        const accumulationTargetGpuTexture = renderer.caches.getTexture(renderDevice, accumulationTargetTexture)
        const bloomLevelGpuTexture = renderer.caches.getTexture(renderDevice, level.texture)

        renderFullscreenPass(
          renderDevice,
          accumulationTargetGpuTexture,
          accumulatePipeline,
          createAccumulationBindGroup(
            renderDevice,
            bloomPipelineState,
            accumulationSourceGpuTexture,
            bloomLevelGpuTexture,
            sampler
          )
        )

        ;[accumulationSourceTexture, accumulationTargetTexture] = [accumulationTargetTexture, accumulationSourceTexture]
      }

      const bloomTexture = accumulationSourceTexture

      renderFullscreenPass(
        renderDevice,
        renderer.caches.getTexture(renderDevice, outputColor),
        compositePipeline,
        createCompositeBindGroup(
          renderDevice,
          bloomPipelineState,
          bloomBuffer,
          bloomUniform.bindingSize,
          sourceTexture,
          renderer.caches.getTexture(renderDevice, bloomTexture),
          sampler
        ),
        [bloomOffset]
      )

      cameraColorTarget.setColor(targetPool, outputColor)

      for (const texture of temporaryTextures) {
        targetPool.recycle(texture)
      }

      bloomIndex++
    }
  }
}

/**
 * @param {Texture2DPool} targetPool
 * @param {import("../../../texture/index.js").Texture} sourceColor
 */
function createBloomPyramid(targetPool, sourceColor) {
  const levels = []
  let width = sourceColor.width
  let height = sourceColor.height

  levels.push({
    texture: targetPool.get(createBloomTextureDescriptor(width, height)),
    pingTexture: undefined
  })

  for (let i = 1; i < BLOOM_PYRAMID_LEVELS; i++) {
    const nextWidth = Math.max(1, Math.floor(width / 2))
    const nextHeight = Math.max(1, Math.floor(height / 2))

    if (nextWidth === width && nextHeight === height) {
      break
    }

    levels.push({
      texture: targetPool.get(createBloomTextureDescriptor(nextWidth, nextHeight)),
      pingTexture: targetPool.get(createBloomTextureDescriptor(nextWidth, nextHeight))
    })

    width = nextWidth
    height = nextHeight
  }

  return levels
}

/**
 * @param {number} width
 * @param {number} height
 */
function createBloomTextureDescriptor(width, height) {
  return {
    width,
    height,
    depth: 1,
    format: TextureFormat.RGBA16Float
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {BloomPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUBuffer} bloomBuffer
 * @param {number} bloomBindingSize
 * @param {import("../../../core/resources/index.js").GPUTexture} sourceTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} sampler
 */
function createExtractBindGroup(device, pipelineState, bloomBuffer, bloomBindingSize, sourceTexture, sampler) {
  return device.createBindGroup({
    label: "BloomExtractBindGroup",
    layout: pipelineState.extractBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: bloomBuffer,
          size: bloomBindingSize
        }
      },
      {
        binding: 1,
        resource: {
          texture: sourceTexture
        }
      },
      {
        binding: 2,
        resource: {
          sampler
        }
      }
    ]
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {GaussianBlurPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUTexture} sourceTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} sampler
 */
function createBlurBindGroup(device, pipelineState, sourceTexture, sampler) {
  return device.createBindGroup({
    label: "BloomBlurBindGroup",
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
          sampler
        }
      }
    ]
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {BloomPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUTexture} accumTexture
 * @param {import("../../../core/resources/index.js").GPUTexture} bloomTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} sampler
 */
function createAccumulationBindGroup(device, pipelineState, accumTexture, bloomTexture, sampler) {
  return device.createBindGroup({
    label: "BloomAccumulateBindGroup",
    layout: pipelineState.accumulateBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          texture: accumTexture
        }
      },
      {
        binding: 1,
        resource: {
          sampler
        }
      },
      {
        binding: 2,
        resource: {
          texture: bloomTexture
        }
      },
      {
        binding: 3,
        resource: {
          sampler
        }
      }
    ]
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {BloomPipeline} pipelineState
 * @param {import("../../../core/resources/index.js").GPUBuffer} bloomBuffer
 * @param {number} bloomBindingSize
 * @param {import("../../../core/resources/index.js").GPUTexture} sceneTexture
 * @param {import("../../../core/resources/index.js").GPUTexture} bloomTexture
 * @param {import("../../../core/resources/index.js").GPUSampler} sampler
 */
function createCompositeBindGroup(device, pipelineState, bloomBuffer, bloomBindingSize, sceneTexture, bloomTexture, sampler) {
  return device.createBindGroup({
    label: "BloomCompositeBindGroup",
    layout: pipelineState.compositeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: bloomBuffer,
          size: bloomBindingSize
        }
      },
      {
        binding: 1,
        resource: {
          texture: sceneTexture
        }
      },
      {
        binding: 2,
        resource: {
          sampler
        }
      },
      {
        binding: 3,
        resource: {
          texture: bloomTexture
        }
      },
      {
        binding: 4,
        resource: {
          sampler
        }
      }
    ]
  })
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../core/resources/index.js").GPUTexture} outputTexture
 * @param {import("../../../core/index.js").WebGLRenderPipeline} pipeline
 * @param {import("../../../core/index.js").WebGLBindGroup} bindGroup
 * @param {number[] | undefined} [dynamicOffsets]
 */
function renderFullscreenPass(device, outputTexture, pipeline, bindGroup, dynamicOffsets) {
  const pass = device.beginRenderPass({
    width: outputTexture.width,
    height: outputTexture.height,
    colorAttachments: [{
      texture: outputTexture,
      layer: 0,
      loadOp: "clear",
      storeOp: "store",
      clearValue: [0, 0, 0, 0]
    }]
  })

  pass.setPipeline(pipeline)
  pass.setBindGroup(0, bindGroup, dynamicOffsets)
  pass.draw(3)
  pass.end()
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../core/resources/index.js").GPUTexture} texture
 */
function clearTexture(device, texture) {
  const pass = device.beginRenderPass({
    width: texture.width,
    height: texture.height,
    colorAttachments: [{
      texture,
      layer: 0,
      loadOp: "clear",
      storeOp: "store",
      clearValue: [0, 0, 0, 0]
    }]
  })

  pass.end()
}
