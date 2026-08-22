/**@import { WebGLRenderPipelineDescriptor } from '../../../core/index.js' */
import { CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat, UniformType } from "../../../constants/index.js"
import { Affine3 } from "../../../math/index.js"
import { Camera, Object3D, SkyBox } from "../../../objects/index.js"
import { RenderItem, ViewBindGroups, Views } from "../../../renderer/index.js"
import { skyboxFragment, skyboxVertex } from "../../../shader/index.js"
import { assert } from "../../../utils/index.js"
import { SkyboxPipeline, SkyBoxMesh } from "../resources/index.js"
/** @import { Texture } from "../../../texture/index.js" */

/** @type {WeakMap<SkyBox, import("../../../caches/uniformbuffers.js").UniformBuffer>} */
const skyboxUniformBuffers = new WeakMap()

let skyboxUniformBufferId = 0

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

      const opaqueStage = view.opaque

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
 * @returns {RenderItem | undefined}
 */
function createSkyboxRenderItem(object, device, renderer, view) {
  const skyboxMesh = renderer.getResource(SkyBoxMesh)
  const skyboxPipeline = renderer.getResource(SkyboxPipeline)

  assert(skyboxMesh, "SkyBoxMesh resource missing")
  assert(skyboxPipeline, "SkyboxPipeline resource missing")

  const day = object.day ?? object.night
  const night = object.night ?? object.day

  if (!day || !night) {
    return undefined
  }

  const mesh = renderer.caches.getMesh(device, skyboxMesh.cube, renderer.attributes)
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
    skyboxBlockLayout,
    day,
    night,
    object
  )

  return new RenderItem({
    pipelineId,
    bindGroup,
    tag: SkyBox.name,
    transform: object.transform.world,
    mesh
  })
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {import("../../../renderer/index.js").View} view
 */
function getSkyboxRenderPipeline(device, renderer, view) {
  const skyboxPipeline = renderer.getResource(SkyboxPipeline)
  const sceneBindGroups = renderer.getResource(ViewBindGroups)
  const { caches, includes, defines: globalDefines } = renderer

  assert(skyboxPipeline, "SkyboxPipeline resource missing")
  assert(sceneBindGroups, "SceneBindGroups resource missing")
  const object = view.object

  assert(object, "View object missing")
  const sceneBindGroup = sceneBindGroups.getOrSet(device, object)

  assert(sceneBindGroup, "Scene bind group missing")
  assert(sceneBindGroup.layout, "SceneBindGroup layout missing")

  if (skyboxPipeline.pipelineId !== undefined) {
    return skyboxPipeline.pipelineId
  }
  const vertexShader = new Shader({
    source: skyboxVertex,
    defines: new Map(globalDefines),
    includes: new Map(includes)
  })
  const fragmentShader = new Shader({
    source: skyboxFragment,
    defines: new Map(globalDefines),
    includes: new Map(includes)
  })

  /**
   * @type {WebGLRenderPipelineDescriptor}
   */
  const descriptor = {
    depthWrite: false,
    depthCompare: CompareFunction.Lequal,
    cullFace: CullFace.Front,
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

  const bindGroupLayout = device.createBindGroupLayout({
    label: "SkyBoxBindGroupLayout",
    entries: [
      {
        binding: 0,
        name: "SkyBoxBlock",
        visibility: 0,
        buffer: {
          type: "uniform",
          minBindingSize: skyboxBlockLayout.size
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

  skyboxPipeline.bindGroupLayout = bindGroupLayout
  skyboxPipeline.pipelineLayout = pipeline.layout

  const sceneLayout = skyboxPipeline.pipelineLayout.getBindGroupLayout(0)

  if (!sceneLayout) {
    skyboxPipeline.pipelineLayout.setBindGroupLayout(0, sceneBindGroup.layout)
  }

  skyboxPipeline.pipelineLayout.setBindGroupLayout(1, bindGroupLayout)

  skyboxPipeline.pipelineId = newId

  return newId
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {SkyboxPipeline} skyboxPipeline
 * @param {import("../../../core/layouts/uniformbuffer.js").UniformBufferLayout} layout
 * @param {Texture} day
 * @param {Texture} night
 * @param {SkyBox} object
 */
function createSkyboxBindGroup(device, renderer, skyboxPipeline, layout, day, night, object) {
  const dayTexture = renderer.caches.getTexture(device, day)
  const nightTexture = renderer.caches.getTexture(device, night)
  const gpuSampler = renderer.caches.getSampler(device, renderer.defaults.textureSampler)
  const uniformBuffer = getSkyboxUniformBuffer(device, renderer, layout, object)
  const bindGroupLayout = skyboxPipeline.bindGroupLayout

  assert(bindGroupLayout, "SkyBox bind group layout missing")

  uniformBuffer.update(device.context, createSkyboxUniformData(layout, object))

  return device.createBindGroup({
    label: "SkyBoxBindGroup",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer.buffer
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

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 * @param {import("../../../core/layouts/uniformbuffer.js").UniformBufferLayout} layout
 * @param {SkyBox} object
 */
function getSkyboxUniformBuffer(device, renderer, layout, object) {
  const existing = skyboxUniformBuffers.get(object)

  if (existing) {
    return existing
  }

  const template = renderer.caches.uniformBuffers.get("SkyBoxBlock")

  assert(template, "SkyBoxBlock uniform buffer missing")

  const name = `SkyBoxBlock:${skyboxUniformBufferId++}`
  const buffer = renderer.caches.uniformBuffers.getorSet(device, name, layout)

  skyboxUniformBuffers.set(object, buffer)
  return buffer
}

/**
 * @param {import("../../../core/layouts/uniformbuffer.js").UniformBufferLayout} layout
 * @param {SkyBox} object
 */
function createSkyboxUniformData(layout, object) {
  const data = new ArrayBuffer(layout.size)
  const floats = new Float32Array(data)
  const transformMatrix = new Float32Array([...Affine3.toMatrix4(object.transform.world)])
  let modelWritten = false
  let lerpWritten = false

  for (const field of layout.fields.values()) {
    const offset = field.offset / Float32Array.BYTES_PER_ELEMENT

    if (field.type === UniformType.Mat4) {
      floats.set(transformMatrix, offset)
      modelWritten = true
      continue
    }

    if (field.type === UniformType.Float) {
      floats[offset] = object.lerp
      lerpWritten = true
    }
  }

  assert(modelWritten, "SkyBoxBlock model field missing")
  assert(lerpWritten, "SkyBoxBlock lerp field missing")

  return data
}
