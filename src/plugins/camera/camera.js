import { Plugin, SortViewsNode, PrepareMeshInstanceBindGroupsNode, WebGLRenderer } from "../../renderer/index.js";
import { CameraOpaquePassNode, CameraTransparentPassNode, CameraViewNode, CanvasBlitNode, TonemappingNode } from "./nodes/index.js";
import { Texture2DPool } from "./RenderTarget2DPool.js";
import { CameraColorTargets, CanvasBlitPipeline, TonemappingPipeline, TonemappingUniform } from "./resources/index.js";

export class CameraPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {import("../../core/index.js").WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new Texture2DPool())
    renderer.setResource(new CameraColorTargets())
    renderer.setResource(new CanvasBlitPipeline(renderDevice))
    renderer.setResource(new TonemappingUniform(renderDevice))
    renderer.setResource(new TonemappingPipeline(renderDevice))
    renderer.renderGraph.addNode(CameraViewNode.name, new CameraViewNode())
    renderer.renderGraph.addNode(CanvasBlitNode.name, new CanvasBlitNode())
    renderer.renderGraph.addNode(CameraOpaquePassNode.name, new CameraOpaquePassNode())
    renderer.renderGraph.addNode(CameraTransparentPassNode.name, new CameraTransparentPassNode())
    renderer.renderGraph.addNode(TonemappingNode.name, new TonemappingNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(SortViewsNode.name, PrepareMeshInstanceBindGroupsNode.name)
    renderer.renderGraph.addDependency(PrepareMeshInstanceBindGroupsNode.name, CameraOpaquePassNode.name)
    renderer.renderGraph.addDependency(CameraOpaquePassNode.name, CameraTransparentPassNode.name)
    renderer.renderGraph.addDependency(CameraTransparentPassNode.name, TonemappingNode.name)
    renderer.renderGraph.addDependency(TonemappingNode.name, CanvasBlitNode.name)
  }
}
