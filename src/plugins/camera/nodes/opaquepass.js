import { Camera } from "../../../objects/index.js"
import { View, ViewBindGroups, Views, MeshInstanceBindGroups } from "../../../renderer/index.js"
import { MeshMaterialBindGroups } from "../../meshmaterial/resources/index.js"
import { assert } from "../../../utils/index.js"
import { CameraColorTargets } from "../resources/index.js"
import { snapUp } from "../../../math/index.js"

const MESH_INSTANCE_BIND_GROUP_INDEX = 2

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {CameraColorTargets} colorTargets
 * @param {ViewBindGroups} viewBindGroups
 * @param {MeshInstanceBindGroups} meshInstanceBindGroups
 * @param {MeshMaterialBindGroups} materialBindGroups
 */
function renderItems(view, viewIndex, device, renderer, colorTargets, viewBindGroups, meshInstanceBindGroups, materialBindGroups) {
  if (!(view.object instanceof Camera)) {
    return
  }

  const camera = view.object
  const opaqueStage = view.opaque
  const alphaMaskStage = view.alphaMask

  const context = device.context
  const caches = renderer.caches
  const renderTarget = view.renderTarget
  const cameraColorTarget = colorTargets.get(camera)

  assert(renderTarget, "Camera render target missing")
  if (!cameraColorTarget) {
    return
  }
  const object = camera

  const colorTarget = cameraColorTarget.readTarget

  renderTarget.changed()

  const width = colorTarget.width
  const height = colorTarget.height
  const clearColor = camera.clearColor
  const clearValue = clearColor ? /** @type {const} */ ([clearColor.r, clearColor.g, clearColor.b, clearColor.a]) : undefined
  const depthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined

  const pass = device.createCommandEncoder().beginRenderPass({
    width,
    height,
    colorAttachments: [{
      texture: caches.getTexture(device, colorTarget),
      mipLevel: view.colorMipmapLevel,
      layer: view.colorLayer,
      loadOp: clearValue ? "clear" : "load",
      storeOp: "store",
      clearValue
    }],
    depthStencilAttachment: depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
      texture: depthTexture,
      mipLevel: view.depthMipmapLevel,
      layer: view.depthLayer,
      depthLoadOp: camera.clearDepth !== undefined ? "clear" : "load",
      depthStoreOp: "store",
      depthClearValue: camera.clearDepth
    }) : undefined,
    depthRange: view.depthRange
  })

  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)

  pass.setBindGroup(0, viewBindGroups.getOrSet(device, object).createBindGroup(device, caches), [dynamicOffset])

  const meshInstanceEntry = meshInstanceBindGroups.getOrSet(object)
  opaqueStage.renderItems(pass, context, caches, meshInstanceEntry.opaque, MESH_INSTANCE_BIND_GROUP_INDEX, view, materialBindGroups)

  alphaMaskStage.renderItems(pass, context, caches, meshInstanceEntry.alphaMask, MESH_INSTANCE_BIND_GROUP_INDEX, view, materialBindGroups)
  pass.end()
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
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const materialBindGroups = renderer.getResource(MeshMaterialBindGroups)

    assert(views, "Views resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
    assert(materialBindGroups, "MeshMaterialBindGroups resource missing")

    const viewsItems = views.items()

    for (let i = 0; i < viewsItems.length; i++) {
      const view = /**@type {View}*/(viewsItems[i])

      renderItems(view, i, renderDevice, renderer, colorTargets, viewBindGroups, meshInstanceBindGroups, materialBindGroups)
    }
  }
}
