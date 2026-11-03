import { Plugin, SortViewsNode, PrepareMeshInstanceBindGroupsNode, WebGLRenderer } from "../../renderer/index.js";
import {
  ShadowCasterUniformBuffer,
  ShadowMap,
  ShadowPipelines
} from "./resources/index.js";
import { ShadowOccluderNode, ShadowOpaquePassNode, ShadowViewNode } from "./nodes/index.js";
import { CameraOpaquePass3DNode } from "../camera/index.js";
import { BoneTextureResource } from "../meshmaterial/resources/index.js";

export class ShadowPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {import("../../core/index.js").WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    const shadowCasterUniform = new ShadowCasterUniformBuffer(renderDevice)

    renderer.setResource(shadowCasterUniform)
    renderer.setResource(new ShadowMap(renderDevice))
    renderer.setResource(new ShadowPipelines())
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(renderDevice.limits))
    }
    renderer.defines.set('MAX_SHADOW_CASTERS', shadowCasterUniform.capacity.toString())

    renderer.renderGraph
      .addNode(ShadowViewNode.name, new ShadowViewNode())
      .addNode(ShadowOccluderNode.name, new ShadowOccluderNode())
      .addNode(ShadowOpaquePassNode.name, new ShadowOpaquePassNode())
      .addDependency(ShadowViewNode.name, ShadowOccluderNode.name)
      .addDependency(ShadowOccluderNode.name, SortViewsNode.name)
      .addDependency(SortViewsNode.name, PrepareMeshInstanceBindGroupsNode.name)
      .addDependency(PrepareMeshInstanceBindGroupsNode.name, ShadowOpaquePassNode.name)
      .addDependency(ShadowOpaquePassNode.name, CameraOpaquePass3DNode.name)
    
  }
}
