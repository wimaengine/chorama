/**@import { RenderTargetDescriptor } from './descriptors.js' */
import { CullFace, FrontFaceDirection, PrimitiveTopology } from "../../constants/index.js";
import { CompareFunction } from "../constants.js";
import { MeshVertexLayout, UniformBufferLayout, Uniform, WebGLPipelineLayout } from "../layouts/index.js";
import { assert, assertTrue } from "../../utils/index.js";

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
    this.layout.allocateUniformBlocks(this.uniformBlocks)
  }

  /**
   * Binds the pipeline's uniform blocks to the points reserved by its layout.
   * @param {WebGL2RenderingContext} context
   * @param {import("../../caches/uniformbuffers.js").UniformBuffers | undefined} uniformBuffers
   */
  bindUniformBlocks(context, uniformBuffers) {
    if (!uniformBuffers || this.uniformBlocks.size === 0) {
      return
    }

    const invalidIndex = context.INVALID_INDEX ?? 0xFFFFFFFF

    for (const [name] of this.uniformBlocks) {
      const point = this.layout.getUniformBlockPoint(name)
      const uniformBuffer = uniformBuffers.get(name)
      const index = context.getUniformBlockIndex(this.program, name)

      assert(point, `Pipeline layout does not allocate a binding point for uniform block ${name}`)
      assert(uniformBuffer, `Uniform buffer ${name} missing`)
      assertTrue(index !== invalidIndex, `Uniform block ${name} is not active in the shader program`)

      context.bindBufferBase(uniformBuffer.buffer.type, point, uniformBuffer.buffer.inner)
      context.uniformBlockBinding(this.program, index, /** @type {number} */ (point))
    }
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
