import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import { SkyboxPipeline, SkyBoxMesh, SkyBoxUniforms } from "./resources/index.js";
import { SkyBoxNode } from "./nodes/index.js";
import { CameraViewNode } from "../camera/index.js";

export class SkyboxPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.setResource(new SkyboxPipeline())
    renderer.setResource(new SkyBoxMesh())
    renderer.setResource(new SkyBoxUniforms())
    renderer.renderGraph.addNode(SkyBoxNode.name, new SkyBoxNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, SkyBoxNode.name)
    renderer.renderGraph.addDependency(SkyBoxNode.name, SortViewsNode.name)
  }
}
