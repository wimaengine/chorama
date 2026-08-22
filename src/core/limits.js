/**
 * WebGPU-shaped device limits derived from a WebGL2 context.
 *
 * Only GPUSupportedLimits-style fields are exposed. When WebGL2 does not have
 * a direct equivalent, the value is a conservative compatibility fallback.
 */
export class WebGLDeviceLimits {
  /**
   * @type {number}
   */
  maxBindGroups

  /**
   * @type {number}
   */
  maxBindGroupsPlusVertexBuffers

  /**
   * @type {number}
   */
  maxBindingsPerBindGroup

  /**
   * @type {number}
   */
  maxBufferSize

  /**
   * @type {number}
   */
  maxColorAttachmentBytesPerSample

  /**
   * @type {number}
   */
  maxColorAttachments

  /**
   * @type {number}
   */
  maxComputeInvocationsPerWorkgroup

  /**
   * @type {number}
   */
  maxComputeWorkgroupSizeX

  /**
   * @type {number}
   */
  maxComputeWorkgroupSizeY

  /**
   * @type {number}
   */
  maxComputeWorkgroupSizeZ

  /**
   * @type {number}
   */
  maxComputeWorkgroupStorageSize

  /**
   * @type {number}
   */
  maxComputeWorkgroupsPerDimension

  /**
   * @type {number}
   */
  maxDynamicStorageBuffersPerPipelineLayout

  /**
   * @type {number}
   */
  maxDynamicUniformBuffersPerPipelineLayout

  /**
   * @type {number}
   */
  maxImmediateSize

  /**
   * @type {number}
   */
  maxInterStageShaderVariables

  /**
   * @type {number}
   */
  maxSampledTexturesPerShaderStage

  /**
   * @type {number}
   */
  maxSamplersPerShaderStage

  /**
   * @type {number}
   */
  maxStorageBufferBindingSize

  /**
   * @type {number}
   */
  maxStorageBuffersInFragmentStage

  /**
   * @type {number}
   */
  maxStorageBuffersInVertexStage

  /**
   * @type {number}
   */
  maxStorageBuffersPerShaderStage

  /**
   * @type {number}
   */
  maxStorageTexturesInFragmentStage

  /**
   * @type {number}
   */
  maxStorageTexturesInVertexStage

  /**
   * @type {number}
   */
  maxStorageTexturesPerShaderStage

  /**
   * @type {number}
   */
  maxTextureArrayLayers

  /**
   * @type {number}
   */
  maxTextureDimension1D

  /**
   * @type {number}
   */
  maxTextureDimension2D

  /**
   * @type {number}
   */
  maxTextureDimension3D

  /**
   * @type {number}
   */
  maxUniformBufferBindingSize

  /**
   * @type {number}
   */
  maxUniformBuffersPerShaderStage

  /**
   * @type {number}
   */
  maxVertexAttributes

  /**
   * @type {number}
   */
  maxVertexBufferArrayStride

  /**
   * @type {number}
   */
  maxVertexBuffers

  /**
   * @type {number}
   */
  minStorageBufferOffsetAlignment

  /**
   * @type {number}
   */
  minUniformBufferOffsetAlignment

  /**
   * @param {WebGL2RenderingContext} gl
   */
  constructor(gl) {
    const maxTextureDimension2D = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxTextureDimension3D = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)
    const maxTextureArrayLayers = gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)
    const maxCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)
    const maxVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)
    const maxFragmentTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    const maxUniformBufferBindings = gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS)
    const maxUniformBufferBindingSize = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)
    const maxVertexUniformBlocks = gl.getParameter(gl.MAX_VERTEX_UNIFORM_BLOCKS)
    const maxFragmentUniformBlocks = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_BLOCKS)
    const maxVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
    const maxVaryingComponents = gl.getParameter(gl.MAX_VARYING_COMPONENTS)
    const maxVertexOutputComponents = gl.getParameter(gl.MAX_VERTEX_OUTPUT_COMPONENTS)
    const maxFragmentInputComponents = gl.getParameter(gl.MAX_FRAGMENT_INPUT_COMPONENTS)
    const maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS)
    const maxFramebufferColorAttachments = gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)
    const uniformBufferOffsetAlignment = gl.getParameter(gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT)
    const colorBufferFloat = gl.getExtension("EXT_color_buffer_float")
    const colorBufferHalfFloat = gl.getExtension("EXT_color_buffer_half_float")

    this.maxTextureDimension1D = maxTextureDimension2D
    this.maxTextureDimension2D = maxTextureDimension2D
    this.maxTextureDimension3D = maxTextureDimension3D
    this.maxTextureArrayLayers = maxTextureArrayLayers
    this.maxSampledTexturesPerShaderStage = Math.min(
      maxVertexTextureImageUnits,
      maxFragmentTextureImageUnits,
      maxCombinedTextureImageUnits
    )
    this.maxSamplersPerShaderStage = this.maxSampledTexturesPerShaderStage

    // WebGPU exposes logical bind-group limits. WebGL2 does not, so we use a
    // small compatibility floor and derive the rest from resource counts.
    this.maxBindGroups = 4
    this.maxVertexBuffers = maxVertexAttributes
    this.maxBindGroupsPlusVertexBuffers = this.maxBindGroups + this.maxVertexBuffers
    this.maxBindingsPerBindGroup = maxUniformBufferBindings + maxCombinedTextureImageUnits * 2

    // WebGL2 does not expose a general buffer-size cap, so keep this permissive.
    this.maxBufferSize = Number.MAX_SAFE_INTEGER

    this.maxColorAttachmentBytesPerSample = colorBufferFloat
      ? 16
      : colorBufferHalfFloat
        ? 8
        : 4
    this.maxColorAttachments = Math.min(maxDrawBuffers, maxFramebufferColorAttachments)

    this.maxComputeInvocationsPerWorkgroup = 0
    this.maxComputeWorkgroupSizeX = 0
    this.maxComputeWorkgroupSizeY = 0
    this.maxComputeWorkgroupSizeZ = 0
    this.maxComputeWorkgroupStorageSize = 0
    this.maxComputeWorkgroupsPerDimension = 0
    this.maxDynamicStorageBuffersPerPipelineLayout = 0
    this.maxDynamicUniformBuffersPerPipelineLayout = 0
    this.maxImmediateSize = 0
    this.maxInterStageShaderVariables = Math.min(
      maxVaryingComponents,
      maxVertexOutputComponents,
      maxFragmentInputComponents
    )
    this.maxStorageBufferBindingSize = 0
    this.maxStorageBuffersInFragmentStage = 0
    this.maxStorageBuffersInVertexStage = 0
    this.maxStorageBuffersPerShaderStage = 0
    this.maxStorageTexturesInFragmentStage = 0
    this.maxStorageTexturesInVertexStage = 0
    this.maxStorageTexturesPerShaderStage = 0

    this.maxUniformBufferBindingSize = maxUniformBufferBindingSize
    this.maxUniformBuffersPerShaderStage = Math.min(maxVertexUniformBlocks, maxFragmentUniformBlocks)
    this.maxVertexAttributes = maxVertexAttributes
    this.maxVertexBufferArrayStride = 255
    this.minStorageBufferOffsetAlignment = 1
    this.minUniformBufferOffsetAlignment = uniformBufferOffsetAlignment
  }
}
