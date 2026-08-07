/**@import { WebGLRenderDevice } from "../../../core/index.js" */
import { ACESFilmicTonemapping, AgXTonemapping, Camera, HableTonemapping, KhronosPBRNeutralTonemapping, ReinhardToneMapping } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { CanvasTarget } from "../../../rendertarget/index.js"
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { assert } from "../../../utils/index.js"
import { fullscreenVertex, tonemappingFragment } from "../../../shader/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { CameraColorTargets, TonemappingPipeline } from "../resources/index.js"

export class TonemappingNode {
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
    const pipelineState = renderer.getResource(TonemappingPipeline)
    const colorTargets = renderer.getResource(CameraColorTargets)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(pipelineState, "TonemappingPipeline resource missing")
    assert(colorTargets, "Camera color targets resource missing")

    const actualViews = views.items()

    for (let i = 0; i < actualViews.length; i++) {
      const view = /**@type {View} */(actualViews[i])

      if (!(view.object instanceof Camera)) {
        continue
      }

      if (!(view.object.target instanceof CanvasTarget)) {
        continue
      }

      /** @type {import("../resources/index.js").CameraColorTarget | undefined} */
      const cameraColorTarget = colorTargets.get(view.object)

      assert(cameraColorTarget, "Camera color target missing")

      const colorSource = cameraColorTarget.target
      const toneMapping = view.object.toneMapping

      if (!colorSource) {
        continue
      }

      const pipeline = getTonemappingPipeline(renderDevice, renderer, pipelineState, toneMapping)
      const mainTextureInfo = pipeline.uniforms.get("mainTexture")
      const textureUnit = mainTextureInfo?.texture_unit
      const exposureInfo = pipeline.uniforms.get("exposure")

      assert(mainTextureInfo, "Tonemapping pipeline is missing the mainTexture uniform")
      if (textureUnit === undefined) {
        throw "Tonemapping pipeline is missing a mainTexture texture unit"
      }

      const outputColor = targetPool.get({
        width: view.object.target.canvas.width,
        height: view.object.target.canvas.height,
        format: TextureFormat.RGBA8Unorm
      })

      const source = renderer.caches.getTexture(renderDevice, colorSource)

      const pass = renderDevice.beginRenderPass({
        width: outputColor.width,
        height: outputColor.height,
        colorAttachments: [{
          texture: renderer.caches.getTexture(renderDevice, outputColor),
          layer: 0,
          loadOp: "load",
          storeOp: "store"
        }]
      })

      pass.setPipeline(pipeline, renderer.caches.uniformBuffers)
      renderDevice.context.activeTexture(WebGL2RenderingContext.TEXTURE0 + textureUnit)
      renderDevice.context.bindTexture(source.type, source.inner)

      if (exposureInfo) {
        renderDevice.context.uniform1f(exposureInfo.location, getToneMappingExposure(toneMapping))
      }

      pass.draw(3)
      pass.end()

      cameraColorTarget.setColor(targetPool, outputColor)
    }
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {TonemappingPipeline} pipelineState
 * @param {Camera["toneMapping"]} toneMapping
 */
function getTonemappingPipeline(device, renderer, pipelineState, toneMapping) {
  const key = getToneMappingPipelineKey(toneMapping)
  const pipelineId = pipelineState.pipelineIds.get(key)

  if (pipelineId !== undefined) {
    const pipeline = renderer.caches.getRenderPipeline(pipelineId)
    if (pipeline) {
      return pipeline
    }
    pipelineState.pipelineIds.delete(key)
  }

  const vertexShader = new Shader({
    source: fullscreenVertex
  })
  const fragmentShader = new Shader({
    source: tonemappingFragment
  })

  if (toneMapping instanceof ReinhardToneMapping) {
    fragmentShader.defines.set("REINHARD_TONEMAP", "1")
  } else if (toneMapping instanceof HableTonemapping) {
    fragmentShader.defines.set("HABLE_TONEMAP", "1")
  } else if (toneMapping instanceof ACESFilmicTonemapping) {
    fragmentShader.defines.set("ACES_FILMIC_TONEMAP", "1")
  } else if (toneMapping instanceof AgXTonemapping) {
    fragmentShader.defines.set("AGX_TONEMAP", "1")
  } else if (toneMapping instanceof KhronosPBRNeutralTonemapping) {
    fragmentShader.defines.set("KHRONOS_PBR_NEUTRAL_TONEMAP", "1")
  }

  /**
   * @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
    depthWrite: false,
    depthCompare: CompareFunction.Always,
    cullFace: CullFace.None,
    topology: PrimitiveTopology.Triangles,
    vertexLayout: new MeshVertexLayout([]),
    vertex: vertexShader,
    fragment: {
      source: fragmentShader,
      targets: [{
        format: TextureFormat.RGBA8Unorm
      }]
    }
  }

  for (const [name, value] of renderer.defines) {
    vertexShader.defines.set(name, value)
    fragmentShader.defines.set(name, value)
  }
  for (const [name, value] of renderer.includes) {
    vertexShader.includes.set(name, value)
    fragmentShader.includes.set(name, value)
  }

  const [pipeline, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  pipelineState.pipelineIds.set(key, newId)
  return pipeline
}

/**
 * @param {Camera["toneMapping"]} toneMapping
 */
function getToneMappingPipelineKey(toneMapping) {
  if (toneMapping instanceof ReinhardToneMapping) {
    return "reinhard"
  }

  if (toneMapping instanceof HableTonemapping) {
    return "hable"
  }

  if (toneMapping instanceof ACESFilmicTonemapping) {
    return "aces_filmic"
  }

  if (toneMapping instanceof AgXTonemapping) {
    return "agx"
  }

  if (toneMapping instanceof KhronosPBRNeutralTonemapping) {
    return "khronos_pbr_neutral"
  }

  return "none"
}

/**
 * @param {Camera["toneMapping"]} toneMapping
 */
function getToneMappingExposure(toneMapping) {
  if (
    toneMapping instanceof ReinhardToneMapping ||
    toneMapping instanceof HableTonemapping ||
    toneMapping instanceof ACESFilmicTonemapping ||
    toneMapping instanceof AgXTonemapping ||
    toneMapping instanceof KhronosPBRNeutralTonemapping
  ) {
    return toneMapping.exposure
  }

  return 1
}
