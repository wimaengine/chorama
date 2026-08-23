/**@import { RenderTargetDescriptor } from './descriptors.js' */
import { CullFace, FrontFaceDirection, PrimitiveTopology } from "../../constants/index.js";
import { CompareFunction } from "../constants.js";
import { MeshVertexLayout, UniformBufferLayout, Uniform, WebGLPipelineLayout } from "../layouts/index.js";

export class WebGLRenderPipeline {
  /**
   * @readonly
   * @type {WebGLPipelineLayout}
   */
  layout

  /**
   * @param {WebGLRenderPipelineOptions} descriptor
   */
  constructor({
    program,
    targets,
    uniforms,
    uniformBlocks,
    layout,
    topology,
    vertexLayout,
    depthCompare,
    depthWrite,
    cullFace,
    frontFace
  }) {
    this.program = program
    this.uniforms = uniforms
    this.uniformBlocks = uniformBlocks
    this.vertexLayout = vertexLayout
    this.topology = topology
    this.cullMode = cullFace
    this.depthCompare = depthCompare
    this.depthWrite = depthWrite
    this.frontFace = frontFace
    this.targets = targets
    this.layout = layout
  }

  /**
   * @param {WebGL2RenderingContext} gl
   */
  dispose(gl) {
    gl.deleteProgram(this.program)
  }
}

/**
 * @typedef WebGLRenderPipelineOptions
 * @property {WebGLProgram} program
 * @property {WebGLPipelineLayout} layout
 * @property {Map<string, Uniform>} uniforms
 * @property {Map<string, UniformBufferLayout>} uniformBlocks
 * @property {RenderTargetDescriptor[]} targets
 * @property {MeshVertexLayout} vertexLayout
 * @property {PrimitiveTopology} topology
 * @property {CullFace} cullFace
 * @property {boolean} depthWrite
 * @property {CompareFunction} depthCompare
 * @property {FrontFaceDirection} frontFace
 */
