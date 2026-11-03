import { Plugin, SortViewsNode, PrepareMeshInstanceBindGroupsNode, WebGLRenderer } from "../../renderer/index.js";
import { BloomNode, CameraOpaquePass2DNode, CameraOpaquePass3DNode, CameraPrePass3DNode, CameraTransparentPass2DNode, CameraTransparentPass3DNode, CameraViewNode, CanvasBlitNode, FogNode, TonemappingNode } from "./nodes/index.js";
import { Texture2DPool } from "./RenderTarget2DPool.js";
import { BloomPipeline, BloomUniform, CameraColorTargets, CanvasBlitPipeline, FogPipeline, FogUniform, GaussianBlurPipeline, PrePassPipeline, PrePassTextures, TonemappingPipeline, TonemappingUniform } from "./resources/index.js";

export class CameraPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {import("../../core/index.js").WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new Texture2DPool())
    renderer.setResource(new CameraColorTargets())
    renderer.setResource(new PrePassTextures())
    renderer.setResource(new PrePassPipeline())
    renderer.setResource(new CanvasBlitPipeline(renderDevice))
    renderer.setResource(new TonemappingUniform(renderDevice))
    renderer.setResource(new TonemappingPipeline(renderDevice))
    renderer.setResource(new BloomUniform(renderDevice))
    renderer.setResource(new BloomPipeline(renderer, renderDevice))
    renderer.setResource(new FogUniform(renderDevice))
    renderer.setResource(new FogPipeline(renderer, renderDevice))
    renderer.setResource(new GaussianBlurPipeline(renderer, renderDevice))
    renderer.renderGraph
      .addNode(CameraViewNode.name, new CameraViewNode())
      .addNode(CanvasBlitNode.name, new CanvasBlitNode())
      .addNode(CameraPrePass3DNode.name, new CameraPrePass3DNode())
      .addNode(CameraOpaquePass3DNode.name, new CameraOpaquePass3DNode())
      .addNode(CameraTransparentPass3DNode.name, new CameraTransparentPass3DNode())
      .addNode(CameraOpaquePass2DNode.name, new CameraOpaquePass2DNode())
      .addNode(CameraTransparentPass2DNode.name, new CameraTransparentPass2DNode())
      .addNode(FogNode.name, new FogNode())
      .addNode(BloomNode.name, new BloomNode())
      .addNode(TonemappingNode.name, new TonemappingNode())
      .addDependency(CameraViewNode.name, SortViewsNode.name)
      .addDependency(SortViewsNode.name, PrepareMeshInstanceBindGroupsNode.name)
      .addDependency(PrepareMeshInstanceBindGroupsNode.name, CameraPrePass3DNode.name)
      .addDependency(CameraPrePass3DNode.name, CameraOpaquePass3DNode.name)
      .addDependency(CameraOpaquePass3DNode.name, CameraTransparentPass3DNode.name)
      .addDependency(CameraTransparentPass3DNode.name, CameraOpaquePass2DNode.name)
      .addDependency(CameraOpaquePass2DNode.name, CameraTransparentPass2DNode.name)
      .addDependency(CameraTransparentPass2DNode.name, FogNode.name)
      .addDependency(FogNode.name, BloomNode.name)
      .addDependency(CameraTransparentPass3DNode.name, BloomNode.name)
      .addDependency(BloomNode.name, TonemappingNode.name)
      .addDependency(TonemappingNode.name, CanvasBlitNode.name)
  }
}
