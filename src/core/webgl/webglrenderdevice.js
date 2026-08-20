/**@import { WebGLBindGroupDescriptor, WebGLBufferDescriptor, WebGLRenderPipelineDescriptor, WebGLSamplerDescriptor, WebGLTextureDescriptor } from './descriptors.js' */
/**@import { WebGLBindGroupLayoutDescriptor, WebGLPipelineLayoutDescriptor } from '../layouts/index.js' */
import { CullFace, FrontFaceDirection, TextureFormat, TextureType, getTextureFormatSize } from "../../constants/index.js"
import { assert, assertTrue } from "../../utils/index.js"
import { getFramebufferAttachment, getWebGLTextureFormat, mapWebGLAttachmentToBufferBit } from "../../function.js"
import { WebGLExtensions } from "../extensions.js"
import { WebGLBindGroupLayout, WebGLPipelineLayout } from "../layouts/index.js"
import { WebGLBindGroup } from "./bindgroup.js"
import { WebGLGPUQueue } from "./gpuqueue.js"
import { WebGLRenderPipeline } from "./renderpipeline.js"
import { WebGLRenderPassEncoder } from "./renderpassencoder.js"
import { GPUBuffer, GPUSampler, GPUTexture } from "../resources/index.js"
import { allocateTexture2D, allocateCubemap, allocateTexture2DArray, createProgramFromSrc, configureSampler } from "./utils.js"
import { CompareFunction } from "../constants.js"

export class WebGLRenderDevice {
  /**
   * @private
   * @type {WebGLFramebuffer}
   */
  drawBuffer
  /**
   * @private
   * @type {WebGLFramebuffer}
   */
  readBuffer
  /**
   * @readonly
   * @type {HTMLCanvasElement}
   */
  canvas

  /**
   * @readonly
   * @type {WebGLExtensions}
   */
  extensions

  /**
   * @readonly
   * @type {WebGL2RenderingContext}
   */
  context

  /**
   * @readonly
   * @type {WebGLGPUQueue}
   */
  queue

  /**
   * @param {HTMLCanvasElement} [canvas]
   * @param {WebGLContextAttributes} [options]
   */
  constructor(canvas, options) {
    this.canvas = canvas || document.createElement('canvas')
    const context = this.canvas.getContext('webgl2', options)

    assert(context, "Webgl context creation failed")

    this.drawBuffer = context.createFramebuffer()
    this.readBuffer = context.createFramebuffer()
    this.context = context
    this.queue = new WebGLGPUQueue(this.context)
    this.extensions = new WebGLExtensions(this.context)
    this.extensions.get("OES_texture_float_linear")
    this.extensions.get("EXT_color_buffer_float")
  }

  /**
   *
   * @param {WebGLRenderPipelineDescriptor} descriptor
   */
  createRenderPipeline(descriptor) {
    const programInfo = createProgramFromSrc(
      this.context,
      descriptor.vertex.compile(),
      descriptor.fragment?.source?.compile() || noopFragment,
      descriptor.vertexLayout
    )

    assert(programInfo, 'Cannot create webgl render pipeline')

    return new WebGLRenderPipeline({
      program: programInfo.program,
      layout: descriptor.layout ?? new WebGLPipelineLayout({ bindGroupLayouts: [] }),
      uniforms: programInfo.uniforms,
      uniformBlocks: programInfo.uniformBlocks,
      vertexLayout: descriptor.vertexLayout,
      topology: descriptor.topology,
      targets: descriptor.fragment?.targets || [],
      frontFace: descriptor.frontFace ?? FrontFaceDirection.CCW,
      cullFace: descriptor.cullFace ?? CullFace.Back,
      depthCompare: descriptor.depthCompare ?? CompareFunction.Less,
      depthWrite: descriptor.depthWrite ?? true
    })
  }

  /**
   * @param {WebGLBindGroupLayoutDescriptor} descriptor
   */
  createBindGroupLayout(descriptor) {
    return new WebGLBindGroupLayout(descriptor)
  }

  /**
   * @param {WebGLPipelineLayoutDescriptor} descriptor
   */
  createPipelineLayout(descriptor) {
    return new WebGLPipelineLayout(descriptor)
  }

  /**
   * @param {WebGLBindGroupDescriptor} descriptor
   */
  createBindGroup(descriptor) {
    return new WebGLBindGroup(descriptor)
  }

  /**
   * @param {import("./descriptors.js").WebGLRenderPassDescriptor} descriptor
   */
  beginRenderPass(descriptor) {
    return new WebGLRenderPassEncoder(this.context, this.drawBuffer, descriptor)
  }

  /**
   * @param {WebGLBufferDescriptor} descriptor
   * @returns {GPUBuffer}
   */
  createBuffer({
    size,
    usage,
    type
  }) {
    const { context } = this
    const buffer = context.createBuffer()

    context.bindBuffer(type, buffer)
    context.bufferData(type, size, usage)

    return new GPUBuffer(context, buffer, type, size)
  }

  /**
   * @param {WebGLTextureDescriptor} descriptor
   * @returns {GPUTexture}
   */
  createTexture(descriptor) {
    const { width, height, depth = 1, mipmapCount = 1, type, format } = descriptor
    const { context } = this
    const texture = context.createTexture()
    const form = getWebGLTextureFormat(format)

    assert(form, "Invalid texture format")

    context.bindTexture(type, texture)
    switch (type) {
      case TextureType.Texture2D:
        allocateTexture2D(context, descriptor, form)
        break
      case TextureType.TextureCubeMap:
        allocateCubemap(context, descriptor, form)
        break
      case TextureType.Texture2DArray:
        allocateTexture2DArray(context, descriptor, form)
        break
      default:
        throw "The texture type is not supported."
    }
    const pixelSize = getTextureFormatSize(format)
    return new GPUTexture(context, texture, type, form, format, width, height, depth, mipmapCount, pixelSize)
  }

  /**
   * @param {WebGLSamplerDescriptor} sampler
   * @returns {GPUSampler}
   */
  createSampler(sampler) {
    const { context } = this
    const webglSampler = context.createSampler()

    assert(webglSampler, "Invalid sampler")
    configureSampler(context, webglSampler, sampler)

    return new GPUSampler(context, webglSampler, sampler.compare !== undefined ? "comparison" : "filtering")
  }

  /**
   * @param {WebGLRenderbuffer} source
   * @param {TextureFormat} sourceFormat
   * @param {GPUTexture} destination
   */
  copyRenderBufferToTexture(source, sourceFormat, destination) {
    const { context } = this
    const srcAttachment = getFramebufferAttachment(sourceFormat)
    const dstAttachment = getFramebufferAttachment(destination.actualFormat)

    assertTrue(srcAttachment === dstAttachment, "Textures need to bind to same attachment to be copy to each other")

    context.bindFramebuffer(WebGL2RenderingContext.DRAW_FRAMEBUFFER, this.drawBuffer)
    context.bindFramebuffer(WebGL2RenderingContext.READ_FRAMEBUFFER, this.readBuffer)

    context.framebufferRenderbuffer(
      WebGL2RenderingContext.READ_FRAMEBUFFER,
      srcAttachment,
      WebGL2RenderingContext.RENDERBUFFER,
      source
    )
    context.framebufferTexture2D(
      WebGL2RenderingContext.DRAW_FRAMEBUFFER,
      dstAttachment,
      WebGL2RenderingContext.TEXTURE_2D,
      destination.inner,
      0
    )

    context.blitFramebuffer(
      0, 0, destination.width, destination.height,
      0, 0, destination.width, destination.height,
      mapWebGLAttachmentToBufferBit(dstAttachment),
      WebGL2RenderingContext.NEAREST
    )
  }
}

const noopFragment = `#version 300 es
precision mediump float;

void main(){ }
`
