/** @import { WebGLRenderDevice } from "../../../core/index.js" */
import { CompareFunction, Shader } from "../../../core/index.js"
import { TextureFormat } from "../../../constants/index.js"
import { Camera, CameraPrepasses } from "../../../objects/index.js"
import { View, ViewBindGroups, Views, MeshInstanceBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { snapUp } from "../../../math/index.js"
import { Attribute } from "../../../mesh/index.js"
import { basicVertex, prepassFragment } from "../../../shader/index.js"
import { PrePassPipeline, PrePassTextures } from "../resources/index.js"

const MESH_INSTANCE_BIND_GROUP_INDEX = 1

export class CameraPrePassNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const prePassTextures = renderer.getResource(PrePassTextures)

    assert(views, "Views resource missing")
    assert(prePassTextures, "PrePassTextures resource missing")

    const actualViews = views.items()

    for (let i = 0; i < actualViews.length; i++) {
      const view = /** @type {View} */ (actualViews[i])

      if (!(view.object instanceof Camera)) {
        continue
      }

      renderItems(view, i, renderDevice, renderer, prePassTextures)
    }
  }
}

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {PrePassTextures} prePassTextures
 */
function renderItems(view, viewIndex, device, renderer, prePassTextures) {
  const opaqueStage = view.opaque
  const caches = renderer.caches
  const sceneBindGroups = renderer.getResource(ViewBindGroups)
  const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
  const prePassPipelines = renderer.getResource(PrePassPipeline)

  assert(sceneBindGroups, "SceneBindGroups resource missing")
  assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
  assert(prePassPipelines, "PrePassPipeline resource missing")

  if (!(view.object instanceof Camera)) {
    throw "Camera pre-pass expects a camera view"
  }

  const camera = view.object
  const renderNormals = (camera.prepasses & CameraPrepasses.Normal) !== 0
  const renderDepth = (camera.prepasses & CameraPrepasses.Depth) !== 0 || renderNormals

  if (!renderDepth) {
    return
  }

  const renderTarget = view.renderTarget
  const prePassTexture = prePassTextures.get(camera)

  assert(renderTarget, "Camera render target missing")
  assert(prePassTexture, "Pre-pass texture missing")
  assert(prePassTexture.depth, "Depth pre-pass texture missing")

  const sourceDepthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined
  if (!sourceDepthTexture) {
    return
  }

  const sceneBindGroupState = sceneBindGroups.getOrSet(device, camera)
  assert(sceneBindGroupState.layout, "Scene bind group layout missing")

  const meshInstanceEntry = meshInstanceBindGroups.getOrSet(camera)
  const phaseState = meshInstanceEntry.opaque
  assert(phaseState.bindGroup, "Mesh instance phase bind group missing")

  const commandEncoder = device.createCommandEncoder()
  let normalTexture

  if (renderNormals) {
    assert(prePassTexture.normal, "Normal pre-pass texture missing")
    normalTexture = caches.getTexture(device, prePassTexture.normal)
  }

  const pass = commandEncoder.beginRenderPass({
    width: renderTarget.width,
    height: renderTarget.height,
    colorAttachments: renderNormals ? [{
      texture: normalTexture,
      mipLevel: 0,
      layer: 0,
      loadOp: "clear",
      storeOp: "store",
      clearValue: [0, 0, 0, 0]
    }] : [],
    depthStencilAttachment: {
      texture: sourceDepthTexture,
      mipLevel: view.depthMipmapLevel,
      layer: view.depthLayer,
      depthLoadOp: "clear",
      depthStoreOp: "store",
      depthClearValue: camera.clearDepth ?? 1
    },
    viewport: view.viewport,
    scissor: view.scissor || view.viewport,
    depthRange: view.depthRange
  })

  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)
  const sceneBindGroup = sceneBindGroupState.createBindGroup(device, caches)
  const meshItems = opaqueStage.getMeshItems(view)
  const pipelineKind = renderNormals ? "normal" : "depth"

  pass.setBindGroup(0, sceneBindGroup, [dynamicOffset])

  for (let i = 0; i < meshItems.length; i++) {
    const item = /** @type {import("../../../renderer/index.js").RenderItem} */ (meshItems[i])
    const sourcePipeline = caches.getRenderPipeline(item.pipelineId)

    if (!sourcePipeline) {
      continue
    }

    const skinned = isSkinned(sourcePipeline, item)
    const pipelineKey = createPrePassPipelineKey(pipelineKind, sourcePipeline, skinned)
    const sceneBindGroupLayout = /** @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} */ (sceneBindGroupState.layout)

    assert(sceneBindGroupLayout, "Scene bind group layout missing")

    const pipelineId = prePassPipelines.getOrSetCompute(
      sourcePipeline.vertexLayout,
      pipelineKey,
      () => createPrePassPipeline(
        device,
        renderer,
        sourcePipeline,
        skinned,
        renderNormals,
        sceneBindGroupLayout,
        meshInstanceBindGroups.getBindGroupLayout(device)
      )
    )
    const pipeline = caches.getRenderPipeline(pipelineId)

    if (!pipeline) {
      continue
    }

    pass.setPipeline(pipeline)
    pass.setBindGroup(MESH_INSTANCE_BIND_GROUP_INDEX, phaseState.bindGroup, [phaseState.getOffset(i)])

    const mesh = item.mesh
    for (let slot = 0; slot < mesh.vertexBuffers.length; slot++) {
      const binding = mesh.vertexBuffers[slot]

      if (!binding) {
        continue
      }

      pass.setVertexBuffer(slot, binding.buffer, binding.offset, binding.size)
    }

    if (mesh.indexBuffer) {
      assert(mesh.indexFormat, "Indexed mesh is missing an index format")
      pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat, 0, mesh.indexBuffer.size)
      pass.drawIndexed(mesh.count)
    } else {
      pass.draw(mesh.count)
    }
  }

  pass.end()

  const destinationDepthTexture = caches.getTexture(device, prePassTexture.depth)

  commandEncoder.copyTextureToTexture(
    { texture: sourceDepthTexture },
    { texture: destinationDepthTexture },
    {
      width: renderTarget.width,
      height: renderTarget.height,
      depthOrArrayLayers: 1
    }
  )
}

/**
 * @param {string} kind
 * @param {import("../../../core/index.js").WebGLRenderPipeline} sourcePipeline
 * @param {boolean} skinned
 * @returns {string}
 */
function createPrePassPipelineKey(kind, sourcePipeline, skinned) {
  return [
    kind,
    sourcePipeline.topology,
    sourcePipeline.cullMode,
    sourcePipeline.frontFace,
    skinned ? 1 : 0
  ].join(":")
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/index.js").WebGLRenderPipeline} sourcePipeline
 * @param {boolean} skinned
 * @param {boolean} renderNormals
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} sceneBindGroupLayout
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} meshInstanceBindGroupLayout
 * @returns {number}
 */
function createPrePassPipeline(
  device,
  renderer,
  sourcePipeline,
  skinned,
  renderNormals,
  sceneBindGroupLayout,
  meshInstanceBindGroupLayout
) {
  const vertexShader = new Shader({
    source: basicVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  if (skinned) {
    vertexShader.defines.set("SKINNED", "")
  }

  const meshLayout = sourcePipeline.vertexLayout

  if (meshLayout.hasAttribute(Attribute.UV)) {
    vertexShader.defines.set("VERTEX_UVS", "")
  }

  if (meshLayout.hasAttribute(Attribute.Color)) {
    vertexShader.defines.set("VERTEX_COLORS", "")
  }

  if (meshLayout.hasAttribute(Attribute.Normal)) {
    vertexShader.defines.set("VERTEX_NORMALS", "")
  }

  if (meshLayout.hasAttribute(Attribute.Tangent)) {
    vertexShader.defines.set("VERTEX_TANGENTS", "")
  }

  /** @type {import("../../../core/index.js").WebGLRenderPipelineDescriptor["fragment"]} */
  let fragment = undefined

  if (renderNormals) {
    const fragmentShader = new Shader({
      source: prepassFragment,
      defines: new Map(renderer.defines),
      includes: new Map(renderer.includes)
    })

    fragment = {
      source: device.createShaderModule({
        code: fragmentShader.compile(),
        stage: "fragment"
      }),
      targets: [{
        format: TextureFormat.RG16Float
      }]
    }
  }

  const descriptor = {
    depthWrite: true,
    depthCompare: CompareFunction.Less,
    cullFace: sourcePipeline.cullMode,
    frontFace: sourcePipeline.frontFace,
    topology: sourcePipeline.topology,
    vertexLayout: meshLayout,
    vertex: device.createShaderModule({
      code: vertexShader.compile(),
      stage: "vertex"
    }),
    fragment
  }

  const [pipeline, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  pipeline.layout.setBindGroupLayout(0, sceneBindGroupLayout)
  pipeline.layout.setBindGroupLayout(1, meshInstanceBindGroupLayout)

  return newId
}

/**
 * @param {import("../../../core/index.js").WebGLRenderPipeline} sourcePipeline
 * @param {import("../../../renderer/index.js").RenderItem} item
 * @returns {boolean}
 */
function isSkinned(sourcePipeline, item) {
  const meshLayout = sourcePipeline.vertexLayout

  return Boolean(
    item.meshInstance &&
    item.meshInstance.boneCount > 0 &&
    meshLayout.hasAttribute(Attribute.JointIndex) &&
    meshLayout.hasAttribute(Attribute.JointWeight)
  )
}
