import { WebGLRenderDevice } from "../../core/index.js"
import { CameraPrePass3DNode, CameraViewNode } from "../camera/index.js"
import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js"
import { PrepareSpriteInstanceBindGroupsNode, PrepareSpritePipelinesNode, Sprite2dNode } from "./nodes/index.js"
import { SpriteBindGroups, SpriteInstanceBindGroups, SpritePipelines } from "./resources/index.js"

export class SpritePlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new SpriteBindGroups(renderDevice))
    renderer.setResource(new SpritePipelines())
    renderer.setResource(new SpriteInstanceBindGroups(renderDevice))
    renderer.renderGraph
      .addNode(PrepareSpritePipelinesNode.name, new PrepareSpritePipelinesNode())
      .addNode(Sprite2dNode.name, new Sprite2dNode())
      .addNode(PrepareSpriteInstanceBindGroupsNode.name, new PrepareSpriteInstanceBindGroupsNode())
      .addDependency(CameraViewNode.name, PrepareSpritePipelinesNode.name)
      .addDependency(PrepareSpritePipelinesNode.name, Sprite2dNode.name)
      .addDependency(CameraViewNode.name, Sprite2dNode.name)
      .addDependency(Sprite2dNode.name, SortViewsNode.name)
      .addDependency(SortViewsNode.name, PrepareSpriteInstanceBindGroupsNode.name)
      .addDependency(PrepareSpriteInstanceBindGroupsNode.name, CameraPrePass3DNode.name)
  }
}
