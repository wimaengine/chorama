import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import { SkyboxPipeline, SkyBoxUniforms } from "./resources/index.js";
import { SkyBoxNode } from "./nodes/index.js";
import { CameraViewNode } from "../camera/index.js";

export class SkyboxPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.setResource(new SkyboxPipeline())
    renderer.setResource(new SkyBoxUniforms())
    renderer.renderGraph
      .addNode(SkyBoxNode.name, new SkyBoxNode())
      .addDependency(CameraViewNode.name, SkyBoxNode.name)
      .addDependency(SkyBoxNode.name, SortViewsNode.name)
  }
}
