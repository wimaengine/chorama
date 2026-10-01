import { WebGLRenderDevice } from "../../core/index.js";
import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import { CameraViewNode } from '../camera/index.js';
import { MeshMaterialNode, PrepareMaterialBindGroupsNode } from './nodes/index.js';
import { BoneTextureResource, EnvironmentMap, MaterialUniforms, MeshMaterialBindGroups, MeshMaterialPipelines, MeshMaterials, MorphTargetTextures } from './resources/index.js';

export class MeshMaterialPlugin extends Plugin {
  /**
   * @override
   * @param {WebGLRenderer} renderer
   * @param {WebGLRenderDevice} renderDevice
   */
  init(renderer, renderDevice) {
    renderer.setResource(new MeshMaterialPipelines())
    renderer.setResource(new MaterialUniforms())
    renderer.setResource(new MeshMaterials())
    renderer.setResource(new MeshMaterialBindGroups())
    renderer.setResource(new EnvironmentMap())
    if (!renderer.getResource(BoneTextureResource)) {
      renderer.setResource(new BoneTextureResource(renderDevice.limits))
    }
    renderer.setResource(new MorphTargetTextures(renderDevice.limits))
    renderer.renderGraph.addNode(MeshMaterialNode.name, new MeshMaterialNode())
    renderer.renderGraph.addNode(PrepareMaterialBindGroupsNode.name, new PrepareMaterialBindGroupsNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, MeshMaterialNode.name)
    renderer.renderGraph.addDependency(MeshMaterialNode.name, PrepareMaterialBindGroupsNode.name)
    renderer.renderGraph.addDependency(PrepareMaterialBindGroupsNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(MeshMaterialNode.name, SortViewsNode.name)
  }
}
