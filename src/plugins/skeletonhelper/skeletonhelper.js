/**@import { WebGLRenderPipelineDescriptor } from '../../core/index.js' */
import { CompareFunction, MeshVertexLayout, Shader, WebGLRenderDevice } from "../../core/index.js";
import { Affine3 } from "../../math/index.js";
import { PrimitiveTopology, TextureFormat, hasDepthComponent, hasStencilComponent } from "../../constants/index.js";
import { Bone3D, Camera, Object3D, SkeletonHelper } from "../../objects/index.js";
import { Plugin, Views, WebGLRenderer } from "../../renderer/index.js";
import { ImageRenderTarget } from "../../rendertarget/index.js";
import { skeletonFragment, skeletonVertex } from "../../shader/index.js";
import { BoneTextureResource } from "../meshmaterial/resources/index.js";

export class SkeletonHelperPlugin extends Plugin {

  /**
   * @type {number | undefined}
   */
  pipelineId

  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(
        renderer.limits.textures.maxTextureSize,
        renderer.limits.textures.maxArrayTextureLayers
      ))
    }
  }

  /**
   * @param {Object3D} object
   * @param {WebGLRenderDevice} device
   * @param {WebGLRenderer} renderer
   */
  renderObject3D(object, device, renderer) {
    if (
      !(object instanceof SkeletonHelper) ||
      !object.skinnedMesh.skin ||
      object.skinnedMesh.skin.bones.length === 0
    ) {
      return
    }
    const { caches } = renderer
    const boneTextureResource = renderer.getResource(BoneTextureResource)
    const skin = object.skinnedMesh.skin
    const boneIndices = new Map(skin.bones.map((bone, index) => [bone, index]))
    const pipeline = this.getRenderPipeline(device, renderer)
    const skinSlot = boneTextureResource?.collect(skin)
    const transformsInfo = pipeline.uniforms.get("transforms")
    const modelInfo = pipeline.uniforms.get("model")
    const parentInfo = pipeline.uniforms.get("parent_index")
    const childInfo = pipeline.uniforms.get("child_index")

    if (
      !boneTextureResource || !skinSlot ||
      !transformsInfo || transformsInfo.texture_unit === undefined ||
      !modelInfo || !parentInfo || !childInfo) {
      console.warn("uniforms are not set up correctly in shader")
      return
    }

    const view = renderer.getResource(Views)?.items().find((view) => view.tag === Camera.name)

    if (!view) {
      return
    }

    if (!(view.renderTarget instanceof ImageRenderTarget)) {
      return
    }

    const renderTarget = view.renderTarget
    const depthTexture = view.depthTexture ? caches.getTexture(device, view.depthTexture) : undefined
    const depthStencilAttachment = depthTexture ? /** @type {import("../../core/index.js").WebGLRenderPassDepthStencilAttachment} */ ({
      texture: depthTexture,
      layer: renderTarget.layer
    }) : undefined

    if (depthTexture && depthStencilAttachment && hasDepthComponent(depthTexture.actualFormat)) {
      depthStencilAttachment.depthLoadOp = "load"
      depthStencilAttachment.depthStoreOp = "store"
    }

    if (depthTexture && depthStencilAttachment && hasStencilComponent(depthTexture.actualFormat)) {
      depthStencilAttachment.stencilLoadOp = "load"
      depthStencilAttachment.stencilStoreOp = "store"
    }

    renderTarget.changed()

    const pass = device.beginRenderPass({
      width: renderTarget.width,
      height: renderTarget.height,
      colorAttachments: renderTarget.color.map((texture) => texture ? {
        texture: caches.getTexture(device, texture),
        layer: renderTarget.layer,
        loadOp: /** @type {import("../../core/index.js").WebGLLoadOp} */ ("load"),
        storeOp: /** @type {import("../../core/index.js").WebGLStoreOp} */ ("store")
      } : null),
      depthStencilAttachment,
      viewport: renderTarget.viewport,
      scissor: renderTarget.scissor || renderTarget.viewport
    })

    pass.setPipeline(pipeline, caches.uniformBuffers)
    boneTextureResource.upload(device, renderer)

    const transformsTexture = caches.getTexture(device, boneTextureResource.texture)

    device.context.activeTexture(WebGL2RenderingContext.TEXTURE0 + transformsInfo.texture_unit)
    device.context.bindTexture(boneTextureResource.texture.type, transformsTexture.inner)

    device.context.uniformMatrix4fv(modelInfo.location, false, [...Affine3.toMatrix4(object.skinnedMesh.transform.world)])
    device.context.bindVertexArray(null)

    object.rootBone.traverseBFS((parent) => {
      if (parent instanceof Bone3D) {
        const parentIndex = boneIndices.get(parent)
        if (parentIndex === undefined) {
          return true
        }

        for (let i = 0; i < parent.children.length; i++) {
          const child = parent.children[i]
          if (child instanceof Bone3D) {
            const childIndex = boneIndices.get(child)
            if (childIndex === undefined) {
              continue
            }

            device.context.uniform1ui(parentInfo.location, skinSlot.index + parentIndex)
            device.context.uniform1ui(childInfo.location, skinSlot.index + childIndex)
            pass.draw(2)
          }
        }
      }
      return true
    })
    pass.end()
  }

  /**
 * @param {WebGLRenderDevice} device
 * @param {WebGLRenderer} renderer
 */
  getRenderPipeline(device, renderer) {
    const { caches, includes, defines: globalDefines } = renderer
    if (this.pipelineId) {
      const pipeline = caches.getRenderPipeline(this.pipelineId)

      if (pipeline) {
        return pipeline
      }
    }

    /**
     * @type {WebGLRenderPipelineDescriptor}
     */
    const descriptor = {
      depthWrite: false,
      depthCompare: CompareFunction.Always,
      topology: PrimitiveTopology.Lines,
      vertexLayout: new MeshVertexLayout([]),
      vertex: new Shader({
        source: skeletonVertex
      }),
      fragment: {
        source: new Shader({
          source: skeletonFragment
        }),
        targets: [{
          format: TextureFormat.RGBA8Unorm
        }]
      }
    }

    for (const [name, value] of globalDefines) {
      descriptor.vertex.defines.set(name, value)
      descriptor.fragment?.source?.defines?.set(name, value)
    }
    for (const [name, value] of includes) {
      descriptor.vertex.includes.set(name, value)
      descriptor.fragment?.source?.includes?.set(name, value)
    }
    const [newRenderPipeline, newId] = caches.createRenderPipeline(device, descriptor)

    this.pipelineId = newId
    return newRenderPipeline
  }
}
