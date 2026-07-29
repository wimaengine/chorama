import { Camera } from "../../../objects/index.js"
import { RenderItem, Views } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { Affine3 } from "../../../math/index.js"
import { CanvasTarget } from "../../../rendertarget/index.js"
import { hasDepthComponent, hasStencilComponent } from "../../../constants/index.js"
import { CameraColorTargets } from "../resources/index.js"

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {CameraColorTargets} colorTargets
 */
function renderItems(view, device, renderer, colorTargets) {
  const { renderStage } = view
  const opaquePhase = renderStage.opaque
  const alphaMaskPhase = renderStage.alphaMask

  const context = device.context
  const caches = renderer.caches

  if (!(view.object instanceof Camera)) {
    throw "Camera opaque pass expects a camera view"
  }

  const camera = view.object
  const cameraColorTarget = colorTargets.get(camera)

  assert(cameraColorTarget, "Camera color target missing")

  const colorTarget = cameraColorTarget.target

  if (!colorTarget) {
    return
  }

  camera.target.changed()

  const width = camera.target instanceof CanvasTarget ? camera.target.canvas.width : camera.target.width
  const height = camera.target instanceof CanvasTarget ? camera.target.canvas.height : camera.target.height
  const clearColor = camera.target.clearColor
  const clearValue = clearColor ? /** @type {const} */ ([clearColor.r, clearColor.g, clearColor.b, clearColor.a]) : undefined
  const depthTexture = cameraColorTarget.depthTexture ? caches.getTexture(device, cameraColorTarget.depthTexture) : undefined
  const depthStencilAttachment = depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
    texture: depthTexture,
    layer: cameraColorTarget.layer
  }) : undefined

  if (depthTexture && depthStencilAttachment && hasDepthComponent(depthTexture.actualFormat)) {
    depthStencilAttachment.depthLoadOp = camera.target.clearDepth !== undefined ? "clear" : "load"
    depthStencilAttachment.depthStoreOp = "store"
    depthStencilAttachment.depthClearValue = camera.target.clearDepth
  }

  if (depthTexture && depthStencilAttachment && hasStencilComponent(depthTexture.actualFormat)) {
    depthStencilAttachment.stencilLoadOp = camera.target.clearStencil !== undefined ? "clear" : "load"
    depthStencilAttachment.stencilStoreOp = "store"
    depthStencilAttachment.stencilClearValue = camera.target.clearStencil
  }

  const pass = device.beginRenderPass({
    width,
    height,
    colorAttachments: [{
      texture: caches.getTexture(device, colorTarget),
      layer: cameraColorTarget.layer,
      loadOp: clearValue ? "clear" : "load",
      storeOp: "store",
      clearValue
    }],
    depthStencilAttachment,
    viewport: camera.target.viewport,
    scissor: camera.target.scissor || camera.target.viewport
  })

  if (!opaquePhase) {
    renderPhase(pass, alphaMaskPhase, context, caches)
    pass.end()
    return
  }

  renderPhase(pass, opaquePhase, context, caches)
  renderPhase(pass, alphaMaskPhase, context, caches)
  pass.end()
}

/**
 * @param {import("../../../core/index.js").WebGLRenderPassEncoder} pass
 * @param {RenderItem[] | undefined} phase
 * @param {WebGL2RenderingContext} context
 * @param {import("../../../caches/cache.js").Caches} caches
 */
function renderPhase(pass, phase, context, caches) {
  if (!phase) {
    return
  }

  for (let i = 0; i < phase.length; i++) {
    // SAFETY: List is dense
    const { pipelineId, mesh, bindGroup, transform } = /**@type {RenderItem}*/(phase[i])
    const pipeline = caches.getRenderPipeline(pipelineId)

    if (!pipeline) {
      continue
    }

    const modelInfo = pipeline.uniforms.get("model")
    const transformMatrix = Affine3.toMatrix4(transform)

    pass.setPipeline(pipeline)

    if (modelInfo) {
      context.uniformMatrix4fv(modelInfo.location, false, new Float32Array(transformMatrix))
    }

    if (bindGroup) {
      pass.setBindGroup(0, bindGroup)
    }
    pass.draw(mesh)
  }
}

export class CameraOpaquePassNode {
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

    assert(views, "Views resource missing")
    assert(colorTargets, "Camera color targets resource missing")

    for (const view of views.items()) {
      if (view.tag !== Camera.name) {
        continue
      }

      renderer.updateUBO(renderDevice.context, view.getData())
      renderItems(view, renderDevice, renderer, colorTargets)
    }
  }
}
