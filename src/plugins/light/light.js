import { Plugin, WebGLRenderer } from "../../renderer/index.js";
import { SortViewsNode } from "../../renderer/graph/index.js";
import {
  AmbientLightUniformBuffer,
  DirectionalLightUniformBuffer,
  MAX_DIRECTIONAL_LIGHTS,
  MAX_POINT_LIGHTS,
  MAX_SPOT_LIGHTS,
  PointLightUniformBuffer,
  SpotLightUniformBuffer
} from "./resources/index.js";
import { LightNode } from "./nodes/index.js";

export class LightPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   */
  init(renderer) {
    renderer.defines
      .set("MAX_DIRECTIONAL_LIGHTS", MAX_DIRECTIONAL_LIGHTS.toString())
      .set("MAX_POINT_LIGHTS", MAX_POINT_LIGHTS.toString())
      .set("MAX_SPOT_LIGHTS", MAX_SPOT_LIGHTS.toString())

    renderer.setResource(new AmbientLightUniformBuffer())
    renderer.setResource(new DirectionalLightUniformBuffer())
    renderer.setResource(new PointLightUniformBuffer())
    renderer.setResource(new SpotLightUniformBuffer())

    renderer.renderGraph.addNode(LightNode.name, new LightNode())
    renderer.renderGraph.addDependency(LightNode.name, SortViewsNode.name)
  }
}
