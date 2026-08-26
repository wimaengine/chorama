import { Plugin, SortViewsNode, PrepareMeshInstanceBindGroupsNode, WebGLRenderer } from "../../renderer/index.js";
import { BloomNode, CameraOpaquePassNode, CameraTransparentPassNode, CameraViewNode, CanvasBlitNode, TonemappingNode } from "./nodes/index.js";
import { Texture2DPool } from "./RenderTarget2DPool.js";
import { BloomPipeline, BloomUniform, CameraColorTargets, CanvasBlitPipeline, GaussianBlurPipeline, TonemappingPipeline, TonemappingUniform } from "./resources/index.js";

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
    renderer.setResource(new BloomUniform(renderDevice))
    renderer.setResource(new BloomPipeline(renderer, renderDevice))
    renderer.setResource(new GaussianBlurPipeline(renderer, renderDevice))
    renderer.renderGraph.addNode(CameraViewNode.name, new CameraViewNode())
    renderer.renderGraph.addNode(CanvasBlitNode.name, new CanvasBlitNode())
    renderer.renderGraph.addNode(CameraOpaquePassNode.name, new CameraOpaquePassNode())
    renderer.renderGraph.addNode(CameraTransparentPassNode.name, new CameraTransparentPassNode())
    renderer.renderGraph.addNode(BloomNode.name, new BloomNode())
    renderer.renderGraph.addNode(TonemappingNode.name, new TonemappingNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(SortViewsNode.name, PrepareMeshInstanceBindGroupsNode.name)
    renderer.renderGraph.addDependency(PrepareMeshInstanceBindGroupsNode.name, CameraOpaquePassNode.name)
    renderer.renderGraph.addDependency(CameraOpaquePassNode.name, CameraTransparentPassNode.name)
    renderer.renderGraph.addDependency(CameraTransparentPassNode.name, BloomNode.name)
    renderer.renderGraph.addDependency(BloomNode.name, TonemappingNode.name)
    renderer.renderGraph.addDependency(TonemappingNode.name, CanvasBlitNode.name)
  }
}
