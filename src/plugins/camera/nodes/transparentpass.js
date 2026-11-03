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
  const transparentStage = view.transparent3D

  if (transparentStage.meshItems.length === 0 && transparentStage.nonMeshItems.length === 0) {
    return
  }

  const renderTarget = view.renderTarget
  const cameraColorTarget = colorTargets.get(camera)

  assert(renderTarget, "Camera render target missing")
  if (!cameraColorTarget) {
    return
  }

  const colorTarget = cameraColorTarget.readTarget

  const caches = renderer.caches
  const width = colorTarget.width
  const height = colorTarget.height
  const depthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined

  const pass = device.createCommandEncoder().beginRenderPass({
    width,
    height,
    colorAttachments: [{
      texture: caches.getTexture(device, colorTarget),
      mipLevel: view.colorMipmapLevel,
      layer: view.colorLayer,
      loadOp: "load",
      storeOp: "store"
    }],
    depthStencilAttachment: depthTexture ? /** @type {import("../../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
      texture: depthTexture,
      mipLevel: view.depthMipmapLevel,
      layer: view.depthLayer,
      depthLoadOp: "load",
      depthStoreOp: "store",
      depthReadOnly: true
    }) : undefined,
    depthRange: view.depthRange
  })
  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)

  pass.setBindGroup(0, viewBindGroups.getOrSet(device, camera).createBindGroup(device, caches), [dynamicOffset])

  const meshInstanceEntry = meshInstanceBindGroups.getOrSet(camera)
  transparentStage.renderItems(pass, device.context, caches, meshInstanceEntry.transparent, MESH_INSTANCE_BIND_GROUP_INDEX, view, materialBindGroups)
  pass.end()
}

export class CameraTransparentPassNode {
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
