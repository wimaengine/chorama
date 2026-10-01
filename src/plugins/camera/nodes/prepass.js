/** @import { WebGLRenderDevice } from "../../../core/index.js" */
import { CompareFunction, Shader } from "../../../core/index.js"
import { TextureFormat } from "../../../constants/index.js"
import { Camera, CameraPrepasses } from "../../../objects/index.js"
import { View, ViewBindGroups, Views, MeshInstanceBindGroups } from "../../../renderer/index.js"
import { assert } from "../../../utils/index.js"
import { snapUp } from "../../../math/index.js"
import { Attribute } from "../../../mesh/index.js"
import { PrePassPipeline, PrePassTextures } from "../resources/index.js"
import { MeshMaterialBindGroups, MorphTargetTextures } from "../../meshmaterial/resources/index.js"

const MATERIAL_BIND_GROUP_INDEX = 1
const MESH_INSTANCE_BIND_GROUP_INDEX = 2

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
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const meshInstanceBindGroups = renderer.getResource(MeshInstanceBindGroups)
    const prePassPipelines = renderer.getResource(PrePassPipeline)
    const materialBindGroups = renderer.getResource(MeshMaterialBindGroups)
    const morphTargetTextures = renderer.getResource(MorphTargetTextures)

    assert(views, "Views resource missing")
    assert(prePassTextures, "PrePassTextures resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(meshInstanceBindGroups, "MeshInstanceBindGroups resource missing")
    assert(prePassPipelines, "PrePassPipeline resource missing")
    assert(materialBindGroups, "MeshMaterialBindGroups resource missing")
    assert(morphTargetTextures, "MorphTargetTextures resource missing")

    const actualViews = views.items()

    for (let i = 0; i < actualViews.length; i++) {
      const view = /** @type {View} */ (actualViews[i])

      renderItems(view, i, renderDevice, renderer, prePassTextures, viewBindGroups, meshInstanceBindGroups, prePassPipelines, materialBindGroups, morphTargetTextures)
    }
  }
}

/**
 * @param {import("../../../renderer/index.js").View} view
 * @param {number} viewIndex
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {PrePassTextures} prePassTextures
 * @param {ViewBindGroups} viewBindGroups
 * @param {MeshInstanceBindGroups} meshInstanceBindGroups
 * @param {PrePassPipeline} prePassPipelines
 * @param {MeshMaterialBindGroups} materialBindGroups
 * @param {MorphTargetTextures} morphTargetTextures
 */
function renderItems(view, viewIndex, device, renderer, prePassTextures, viewBindGroups, meshInstanceBindGroups, prePassPipelines, materialBindGroups, morphTargetTextures) {
  if (!(view.object instanceof Camera)) {
    return
  }

  const { object: camera, opaque: opaqueStage } = view
  const { caches } = renderer

  const renderNormals = (camera.prepasses & CameraPrepasses.Normal) !== 0
  const renderDepth = (camera.prepasses & CameraPrepasses.Depth) !== 0 || renderNormals
  const renderTarget = view.renderTarget
  const prePassTexture = prePassTextures.get(camera)
  const sourceDepthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined
  const viewBindGroupState = viewBindGroups.getOrSet(device, camera)

  if (
    !renderDepth || !renderTarget ||
    !prePassTexture || !prePassTexture.depth ||
    !sourceDepthTexture || !viewBindGroupState
  ) {
    return
  }

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
    width: prePassTexture.depth.width,
    height: prePassTexture.depth.height,
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
    depthRange: view.depthRange
  })

  const alignment = device.limits.minUniformBufferOffsetAlignment
  const dynamicOffset = viewIndex * snapUp(View.BlockSize, alignment)
  const viewBindGroup = viewBindGroupState.createBindGroup(device, caches)
  const meshItems = opaqueStage.getMeshItems(view)
  const pipelineKind = renderNormals ? "normal" : "depth"

  pass.setBindGroup(0, viewBindGroup, [dynamicOffset])

  for (let i = 0; i < meshItems.length; i++) {
    const item = /** @type {import("../../../renderer/index.js").MeshRenderItem} */ (meshItems[i])
    const sourcePipeline = caches.getRenderPipeline(item.pipelineId)
    const materialBindGroup = materialBindGroups.get(item.material)
    const materialBindGroupLayout = materialBindGroups.getLayout(item.material)

    if (!sourcePipeline || !materialBindGroup || !materialBindGroupLayout) {
      continue
    }

    const skinned = isSkinned(sourcePipeline, item)
    const morphed = Boolean(item.morphBindGroup)
    const pipelineKey = createPrePassPipelineKey(pipelineKind, sourcePipeline, item.material, skinned, morphed)
    const viewBindGroupLayout = /** @type {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} */ (viewBindGroupState.layout)

    assert(viewBindGroupLayout, "View bind group layout missing")

    const pipelineId = prePassPipelines.getOrSetCompute(
      sourcePipeline.vertexLayout,
      pipelineKey,
      () => createPrePassPipeline(
        device,
        renderer,
        sourcePipeline,
        item.material,
        materialBindGroupLayout,
        skinned,
        morphed,
        renderNormals,
        viewBindGroupLayout,
        meshInstanceBindGroups.getBindGroupLayout(device),
        morphTargetTextures
      )
    )
    const pipeline = caches.getRenderPipeline(pipelineId)

    if (!pipeline) {
      continue
    }

    pass.setPipeline(pipeline)
    pass.setBindGroup(MATERIAL_BIND_GROUP_INDEX, materialBindGroup)
    pass.setBindGroup(MESH_INSTANCE_BIND_GROUP_INDEX, phaseState.bindGroup, [phaseState.getOffset(i)])
    if (item.morphBindGroup) {
      pass.setBindGroup(3, item.morphBindGroup)
    }

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
 * @param {import("../../../material/index.js").RawMaterial} material
 * @param {boolean} skinned
 * @param {boolean} morphed
 * @returns {string}
 */
function createPrePassPipelineKey(kind, sourcePipeline, material, skinned, morphed) {
  return [
    kind,
    material.constructor.name,
    material.getPipelineBits().toString(),
    sourcePipeline.topology,
    sourcePipeline.cullMode,
    sourcePipeline.frontFace,
    skinned ? 1 : 0,
    morphed ? 1 : 0
  ].join(":")
}

/**
 * @param {WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/index.js").WebGLRenderPipeline} sourcePipeline
 * @param {import("../../../material/index.js").RawMaterial} material
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} materialBindGroupLayout
 * @param {boolean} skinned
 * @param {boolean} morphed
 * @param {boolean} renderNormals
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} viewBindGroupLayout
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} meshInstanceBindGroupLayout
 * @param {MorphTargetTextures} morphTargetTextures
 * @returns {number}
 */
function createPrePassPipeline(
  device,
  renderer,
  sourcePipeline,
  material,
  materialBindGroupLayout,
  skinned,
  morphed,
  renderNormals,
  viewBindGroupLayout,
  meshInstanceBindGroupLayout,
  morphTargetTextures
) {
  const vertexShader = new Shader({
    source: material.prepassVertex(),
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  if (skinned) {
    vertexShader.defines.set("SKINNED", "")
  }
  if (morphed) {
    vertexShader.defines.set("MORPH_TARGETS", "")
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
      source: material.prepassFragment(),
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
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        viewBindGroupLayout,
        materialBindGroupLayout,
        meshInstanceBindGroupLayout,
        ...(morphed ? [morphTargetTextures.getBindGroupLayout(device)] : [])
      ]
    }),
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

  const [, newId] = renderer.caches.createRenderPipeline(device, descriptor)
  return newId
}

/**
 * @param {import("../../../core/index.js").WebGLRenderPipeline} sourcePipeline
 * @param {import("../../../renderer/index.js").MeshRenderItem} item
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
