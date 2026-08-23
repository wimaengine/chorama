import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import {
  MAX_SHADOW_CASTERS,
  ShadowCasterUniformBuffer,
  ShadowMap,
  ShadowPipelines
} from "./resources/index.js";
import { ShadowOccluderNode, ShadowOpaquePassNode, ShadowViewNode } from "./nodes/index.js";
import { CameraOpaquePassNode } from "../camera/index.js";

export class ShadowPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.setResource(new ShadowCasterUniformBuffer())
    renderer.setResource(new ShadowMap(MAX_SHADOW_CASTERS))
    renderer.setResource(new ShadowPipelines())
    renderer.defines.set('MAX_SHADOW_CASTERS', MAX_SHADOW_CASTERS.toString())

    renderer.renderGraph.addNode(ShadowViewNode.name, new ShadowViewNode())
    renderer.renderGraph.addNode(ShadowOccluderNode.name, new ShadowOccluderNode())
    renderer.renderGraph.addNode(ShadowOpaquePassNode.name, new ShadowOpaquePassNode())
    renderer.renderGraph.addDependency(ShadowViewNode.name, ShadowOccluderNode.name)
    renderer.renderGraph.addDependency(ShadowOccluderNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(SortViewsNode.name, ShadowOpaquePassNode.name)
    renderer.renderGraph.addDependency(ShadowOpaquePassNode.name, CameraOpaquePassNode.name)
    
  }
}
