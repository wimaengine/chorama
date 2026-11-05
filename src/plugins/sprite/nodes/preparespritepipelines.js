import { BlendParams, CompareFunction, MeshVertexLayout, Shader } from "../../../core/index.js"
import { CullFace, PrimitiveTopology, TextureFormat } from "../../../constants/index.js"
import { Camera } from "../../../objects/index.js"
import { ViewBindGroups, Views } from "../../../renderer/index.js"
import { spriteFragment, spriteVertex } from "../../../shader/index.js"
import { assert } from "../../../utils/index.js"
import { SpriteBindGroups, SpriteInstanceBindGroups, SpritePipelines } from "../resources/index.js"

export class PrepareSpritePipelinesNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const spriteBindGroups = renderer.getResource(SpriteBindGroups)
    const spritePipelines = renderer.getResource(SpritePipelines)
    const spriteInstanceBindGroups = renderer.getResource(SpriteInstanceBindGroups)

    assert(views, "Views resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(spriteBindGroups, "SpriteBindGroups resource missing")
    assert(spritePipelines, "SpritePipelines resource missing")
    assert(spriteInstanceBindGroups, "SpriteInstanceBindGroups resource missing")

    const firstCameraView = views.items().find((view) => view.object instanceof Camera)
    if (!firstCameraView || !(firstCameraView.object instanceof Camera)) {
      return
    }

    const viewBindGroup = viewBindGroups.getOrSet(renderDevice, firstCameraView.object)
    const viewBindGroupLayout = viewBindGroup.layout
    assert(viewBindGroupLayout, "View bind group layout missing")
    const spriteInstanceBindGroupLayout = spriteInstanceBindGroups.getBindGroupLayout(renderDevice)

    if (spritePipelines.opaque === undefined) {
      spritePipelines.opaque = createPipeline(
        renderDevice,
        renderer,
        viewBindGroupLayout,
        spriteBindGroups.bindGroupLayout,
        spriteInstanceBindGroupLayout,
        false,
        false
      )
    }

    if (spritePipelines.alphaMask === undefined) {
      spritePipelines.alphaMask = createPipeline(
        renderDevice,
        renderer,
        viewBindGroupLayout,
        spriteBindGroups.bindGroupLayout,
        spriteInstanceBindGroupLayout,
        true,
        false
      )
    }

    if (spritePipelines.transparent === undefined) {
      spritePipelines.transparent = createPipeline(
        renderDevice,
        renderer,
        viewBindGroupLayout,
        spriteBindGroups.bindGroupLayout,
        spriteInstanceBindGroupLayout,
        false,
        true
      )
    }
  }
}

/**
 * @param {import("../../../core/index.js").WebGLRenderDevice} device
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} viewBindGroupLayout
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} spriteBindGroupLayout
 * @param {import("../../../core/layouts/bindgroup.js").WebGLBindGroupLayout} spriteInstanceBindGroupLayout
 * @param {boolean} alphaMask
 * @param {boolean} transparent
 * @returns {number}
 */
function createPipeline(
  device,
  renderer,
  viewBindGroupLayout,
  spriteBindGroupLayout,
  spriteInstanceBindGroupLayout,
  alphaMask,
  transparent
) {
  const vertexShader = new Shader({
    source: spriteVertex,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })
  const fragmentShader = new Shader({
    source: spriteFragment,
    defines: new Map(renderer.defines),
    includes: new Map(renderer.includes)
  })

  if (alphaMask) {
    fragmentShader.defines.set("ALPHA_MASK_MODE", "")
  }

  const descriptor = {
    layout: device.createPipelineLayout({
      bindGroupLayouts: [
        viewBindGroupLayout,
        spriteBindGroupLayout,
        spriteInstanceBindGroupLayout
      ]
    }),
    cullFace: CullFace.None,
    depthCompare: CompareFunction.Less,
    depthWrite: !transparent,
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
        format: TextureFormat.RGBA8Unorm,
        blend: transparent ? {
          color: BlendParams.AlphaBlend,
          alpha: BlendParams.AlphaBlend
        } : undefined
      }]
    }
  }

  const [, pipelineId] = renderer.caches.createRenderPipeline(device, descriptor)
  return pipelineId
}
