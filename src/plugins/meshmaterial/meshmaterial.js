import { WebGLRenderDevice } from "../../core/index.js";
import { Plugin, SortViewsNode, WebGLRenderer } from "../../renderer/index.js";
import { CameraViewNode } from '../camera/index.js';
import { MeshMaterial2DNode, MeshMaterial3DNode, PrepareMaterialBindGroupsNode } from './nodes/index.js';
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
    renderer.renderGraph.addNode(MeshMaterial3DNode.name, new MeshMaterial3DNode())
    renderer.renderGraph.addNode(MeshMaterial2DNode.name, new MeshMaterial2DNode())
    renderer.renderGraph.addNode(PrepareMaterialBindGroupsNode.name, new PrepareMaterialBindGroupsNode())
    renderer.renderGraph.addDependency(CameraViewNode.name, MeshMaterial3DNode.name)
    renderer.renderGraph.addDependency(MeshMaterial3DNode.name, MeshMaterial2DNode.name)
    renderer.renderGraph.addDependency(CameraViewNode.name, MeshMaterial2DNode.name)
    renderer.renderGraph.addDependency(MeshMaterial3DNode.name, PrepareMaterialBindGroupsNode.name)
    renderer.renderGraph.addDependency(MeshMaterial2DNode.name, PrepareMaterialBindGroupsNode.name)
    renderer.renderGraph.addDependency(PrepareMaterialBindGroupsNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(MeshMaterial3DNode.name, SortViewsNode.name)
    renderer.renderGraph.addDependency(MeshMaterial2DNode.name, SortViewsNode.name)
  }
}
