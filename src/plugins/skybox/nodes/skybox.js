/**@import { WebGLRenderPipelineDescriptor } from '../../../core/index.js' */
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { Camera, Object3D, SkyBox } from "../../../objects/index.js"
import { NonMeshRenderItem, ViewBindGroups, Views } from "../../../renderer/index.js"
import { fullscreenVertex, skyboxFragment } from "../../../shader/index.js"
import { assert } from "../../../utils/index.js"
import { SkyboxPipeline, SkyBoxUniforms } from "../resources/index.js"
/** @import { Texture } from "../../../texture/index.js" */

export class SkyBoxNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice, objects } = context
    const views = renderer.getResource(Views)

    assert(views, "Views resource missing")

    for (const view of views.items()) {
      if (view.tag !== Camera.name) {
        continue
      }

      const opaqueStage = view.opaque3D

      for (let i = 0; i < objects.length; i++) {
        // SAFETY: Asssume the list is dense
        const object = /**@type {Object3D}*/(objects[i])

        object.traverseDFS((child) => {
          if (!child.renderMask.test(view.renderMask)) {
            return true
          }

          if (!(child instanceof SkyBox)) {
            return true
          }

          const item = createSkyboxRenderItem(child, renderDevice, renderer, view)

          if (item) {
            opaqueStage.add(item)
          }

          return true
        })
      }
    }
  }
}

/**
 * @param {SkyBox} object
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {import("../../../renderer/index.js").View} view
 * @returns {NonMeshRenderItem | undefined}
 */
function createSkyboxRenderItem(object, device, renderer, view) {
  const skyboxPipeline = renderer.getResource(SkyboxPipeline)

  assert(skyboxPipeline, "SkyboxPipeline resource missing")

  const texture = object.day ?? object.night

  if (!texture) {
    return undefined
  }

  const day = /** @type {Texture} */ (object.day ?? texture)
  const night = /** @type {Texture} */ (object.night ?? texture)

  const pipelineId = getSkyboxRenderPipeline(device, renderer, view)
  const pipeline = renderer.caches.getRenderPipeline(pipelineId)
  const skyboxBlockLayout = pipeline?.uniformBlocks.get("SkyBoxBlock")

  assert(pipeline, "SkyboxPipeline resource missing")
  assert(skyboxBlockLayout, "SkyBoxBlock uniform block missing")
  assert(skyboxPipeline.bindGroupLayout, "SkyBox bind group layout missing")
  assert(skyboxPipeline.pipelineLayout, "SkyBox pipeline layout missing")

  const bindGroup = createSkyboxBindGroup(
    device,
    renderer,
    skyboxPipeline,
    day,
    night,
    object
  )

  const item = new NonMeshRenderItem({
    pipelineId,
    tag: SkyBox.name,
  })
  item.bindings.set(1, bindGroup)
  return item
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {import("../../../renderer/index.js").View} view
 */
function getSkyboxRenderPipeline(device, renderer, view) {
  const skyboxPipeline = renderer.getResource(SkyboxPipeline)
  const viewBindGroups = renderer.getResource(ViewBindGroups)
  const { caches, includes, defines: globalDefines } = renderer

  assert(skyboxPipeline, "SkyboxPipeline resource missing")
  assert(viewBindGroups, "ViewBindGroups resource missing")
  const object = view.object

  assert(object, "View object missing")
  const viewBindGroup = viewBindGroups.getOrSet(device, object)

  assert(viewBindGroup, "View bind group missing")
  assert(viewBindGroup.layout, "ViewBindGroup layout missing")

  if (skyboxPipeline.pipelineId !== undefined) {
    return skyboxPipeline.pipelineId
  }
  const vertexShader = new Shader({
    source: fullscreenVertex,
    defines: new Map(globalDefines),
    includes: new Map(includes)
  })
  const fragmentShader = new Shader({
    source: skyboxFragment,
    defines: new Map(globalDefines),
    includes: new Map(includes)
  })

  const bindGroupLayout = device.createBindGroupLayout({
    label: "SkyBoxBindGroupLayout",
    entries: [
      {
        binding: 0,
        name: "SkyBoxBlock",
        visibility: 0,
        buffer: {
          type: "uniform",
          minBindingSize: SkyBoxUniforms.BlockSize
        }
      },
      {
        binding: 1,
        name: "day",
        visibility: 0,
        texture: {
          viewDimension: "cube"
        }
      },
      {
        binding: 2,
        name: "day",
        visibility: 0,
        sampler: {
          type: "filtering"
        }
      },
      {
        binding: 3,
        name: "night",
        visibility: 0,
        texture: {
          viewDimension: "cube"
        }
      },
      {
        binding: 4,
        name: "night",
        visibility: 0,
        sampler: {
          type: "filtering"
        }
      }
    ]
  })

  /**
   * @type {WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
    layout: device.createPipelineLayout({
      bindGroupLayouts: [viewBindGroup.layout, bindGroupLayout]
    }),
    depthWrite: false,
    depthCompare: CompareFunction.Lequal,
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
        format: TextureFormat.RGBA8Unorm
      }]
    }
  }

  const [pipeline, newId] = caches.createRenderPipeline(device, descriptor)

  const skyboxBlockLayout = pipeline.uniformBlocks.get("SkyBoxBlock")
  assert(skyboxBlockLayout, "SkyBoxBlock uniform block missing")

  skyboxPipeline.bindGroupLayout = bindGroupLayout
  skyboxPipeline.pipelineLayout = pipeline.layout

  skyboxPipeline.pipelineId = newId

  return newId
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {SkyboxPipeline} skyboxPipeline
 * @param {Texture} day
 * @param {Texture} night
 * @param {SkyBox} object
 */
function createSkyboxBindGroup(device, renderer, skyboxPipeline, day, night, object) {
  const dayTexture = renderer.caches.getTexture(device, day)
  const nightTexture = renderer.caches.getTexture(device, night)
  const gpuSampler = renderer.caches.getSampler(device, renderer.defaults.textureSampler)
  const skyboxUniforms = renderer.getResource(SkyBoxUniforms)
  const bindGroupLayout = skyboxPipeline.bindGroupLayout

  assert(skyboxUniforms, "SkyBoxUniforms resource missing")
  assert(bindGroupLayout, "SkyBox bind group layout missing")

  const uniformBuffer = skyboxUniforms.setData(object)
  const gpuBuffer = renderer.caches.getUniformBuffer(device, uniformBuffer)

  return device.createBindGroup({
    label: "SkyBoxBindGroup",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: gpuBuffer
        }
      },
      {
        binding: 1,
        resource: {
          texture: dayTexture
        }
      },
      {
        binding: 2,
        resource: {
          sampler: gpuSampler
        }
      },
      {
        binding: 3,
        resource: {
          texture: nightTexture
        }
      },
      {
        binding: 4,
        resource: {
          sampler: gpuSampler
        }
      }
    ]
  })
}
