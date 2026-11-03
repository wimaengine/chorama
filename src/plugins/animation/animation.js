import { Plugin, WebGLRenderer } from "../../renderer/index.js"
import { CameraViewNode } from "../camera/index.js"
import { AnimationAdvanceNode } from "./nodes/index.js"

export class AnimationPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.renderGraph
      .addNode(AnimationAdvanceNode.name, new AnimationAdvanceNode())
      .addDependency(AnimationAdvanceNode.name, CameraViewNode.name)
  }
}

