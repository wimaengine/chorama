/**@import { WebGLTextureDescriptor, WebGLWriteTextureDescriptor } from './descriptors.js'*/
import { TextureType, UniformType } from "../../constants/index.js"
import { WebGLTextureFormat, convertBufferToTypedArray } from "../../function.js"
import { Vector3 } from "../../math/index.js"
import { assert } from "../../utils/index.js"
import { MeshVertexLayout, Uniform, UniformBufferLayout } from "../layouts/index.js"

/**
 * Returns the number of mip levels for the given base texture size.
 * @param {TextureType} type
 * @param {number} width
 * @param {number} height
 * @param {number} [depth=1]
 * @returns {number}
 */
export function getMipmapCount(type, width, height, depth = 1) {
  const maxDimension = type === TextureType.Texture3D
    ? Math.max(width, height, depth)
    : Math.max(width, height)

  return Math.floor(Math.log2(Math.max(1, maxDimension))) + 1
}

/**
 * Returns the dimensions for a specific mip level.
 * @param {TextureType} type
 * @param {number} width
 * @param {number} height
 * @param {number} [depth=1]
 * @param {number} [mipmapLevel=0]
 * @returns {{ width: number, height: number, depth: number }}
 */
export function getMipLevelSize(type, width, height, depth = 1, mipmapLevel = 0) {
  const divisor = 2 ** mipmapLevel

  return {
    width: Math.max(1, Math.floor(width / divisor)),
    height: Math.max(1, Math.floor(height / divisor)),
    depth: type === TextureType.Texture3D
      ? Math.max(1, Math.floor(depth / divisor))
      : depth
  }
}

/**
 * @param {WebGL2RenderingContext} context 
 * @param {WebGLTextureDescriptor} descriptor 
 * @param {WebGLTextureFormat} format 
 */
export function allocateTexture2DArray(context, descriptor, format) {
  const mipmapCount = descriptor.mipmapCount || 1
  context.texStorage3D(
    WebGL2RenderingContext.TEXTURE_2D_ARRAY,
    mipmapCount,
    format.internalFormat,
    descriptor.width,
    descriptor.height,
    descriptor.depth || 1
  )
  context.texParameteri(
    WebGL2RenderingContext.TEXTURE_2D_ARRAY,
    WebGL2RenderingContext.TEXTURE_MAX_LEVEL,
    mipmapCount - 1
  )
}

/**
 * @param {WebGL2RenderingContext} context 
 * @param {WebGLTextureDescriptor} descriptor 
 * @param {WebGLTextureFormat} format 
 */
export function allocateTexture2D(context, descriptor, format) {
  const mipmapCount = descriptor.mipmapCount || 1

  for (let level = 0; level < mipmapCount; level++) {
    const { width, height } = getMipLevelSize(
      TextureType.Texture2D,
      descriptor.width,
      descriptor.height,
      1,
      level
    )

    context.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      level,
      format.internalFormat,
      width,
      height,
      0,
      format.format,
      format.dataType,
      null
    )
  }
  context.texParameteri(
    WebGL2RenderingContext.TEXTURE_2D,
    WebGL2RenderingContext.TEXTURE_MIN_FILTER,
    WebGL2RenderingContext.NEAREST
  )
  context.texParameteri(
    WebGL2RenderingContext.TEXTURE_2D,
    WebGL2RenderingContext.TEXTURE_MAG_FILTER,
    WebGL2RenderingContext.NEAREST
  )
  context.texParameteri(
    WebGL2RenderingContext.TEXTURE_2D,
    WebGL2RenderingContext.TEXTURE_MAX_LEVEL,
    mipmapCount - 1
  )
}

/**
 * @param {WebGL2RenderingContext} context 
 * @param {WebGLTextureDescriptor} descriptor 
 * @param {WebGLTextureFormat} format 
 */
export function allocateCubemap(context, descriptor, format) {
  const mipmapCount = descriptor.mipmapCount || 1

  for (let level = 0; level < mipmapCount; level++) {
    const { width, height } = getMipLevelSize(
      TextureType.TextureCubeMap,
      descriptor.width,
      descriptor.height,
      6,
      level
    )

    for (let offset = 0; offset < 6; offset++) {
      context.texImage2D(
        WebGL2RenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X + offset,
        level,
        format.internalFormat,
        width,
        height,
        0,
        format.format,
        format.dataType,
        null
      )
    }
  }
  context.texParameteri(
    WebGL2RenderingContext.TEXTURE_CUBE_MAP,
    WebGL2RenderingContext.TEXTURE_MAX_LEVEL,
    mipmapCount - 1
  )
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLWriteTextureDescriptor} descriptor
 */
export function updateTexture2D(context, descriptor) {
  const {
    texture,
    data: rawData,
    mipmapLevel = 0,
    offset = new Vector3(0, 0, 0),
    size = (() => {
      const levelSize = getMipLevelSize(
        texture.type,
        texture.width,
        texture.height,
        texture.depth,
        mipmapLevel
      )
      return new Vector3(levelSize.width, levelSize.height, levelSize.depth)
    })()
  } = descriptor
  const data = /** @type {ArrayBufferLike} */ (rawData)
  const { format, dataType } = texture.format

  context.texSubImage2D(
    WebGL2RenderingContext.TEXTURE_2D,
    mipmapLevel,
    offset.x,
    offset.y,
    size.x,
    size.y,
    format,
    dataType,
    convertBufferToTypedArray(data, dataType)
  )
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {WebGLWriteTextureDescriptor} descriptor
 */
export function updateTexture2DArray(context, descriptor) {
  const {
    texture,
    data: rawData,
    mipmapLevel = 0,
    offset = new Vector3(0, 0, 0),
    size = (() => {
      const levelSize = getMipLevelSize(
        texture.type,
        texture.width,
        texture.height,
        texture.depth,
        mipmapLevel
      )
      return new Vector3(levelSize.width, levelSize.height, levelSize.depth)
    })()
  } = descriptor
  const data = /** @type {ArrayBufferLike} */ (rawData)
  const { format, dataType } = texture.format

  context.texSubImage3D(
    WebGL2RenderingContext.TEXTURE_2D_ARRAY,
    mipmapLevel,
    offset.x,
    offset.y,
    offset.z,
    size.x,
    size.y,
    size.z,
    format,
    dataType,
    convertBufferToTypedArray(data, dataType)
  )
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLWriteTextureDescriptor} descriptor
 */
export function updateCubeMap(gl, descriptor) {
  const {
    texture,
    data: rawData,
    mipmapLevel = 0,
    offset = new Vector3(0, 0, 0),
    size = (() => {
      const levelSize = getMipLevelSize(
        texture.type,
        texture.width,
        texture.height,
        texture.depth,
        mipmapLevel
      )
      return new Vector3(levelSize.width, levelSize.height, levelSize.depth)
    })()
  } = descriptor
  const data = /** @type {ArrayBufferLike} */ (rawData)
  const { format, dataType } = texture.format
  const { pixelSize } = texture
  const sliceSize = pixelSize * size.x * size.y
  const src = convertBufferToTypedArray(data, dataType)

  for (let i = 0; i < 6; i++) {
    gl.texSubImage2D(
      WebGLRenderingContext.TEXTURE_CUBE_MAP_POSITIVE_X + i,
      mipmapLevel,
      offset.x,
      offset.y,
      size.x,
      size.y,
      format,
      dataType,
      src,
      sliceSize * i
    )
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} vshader
 * @param {string} fshader
 * @param {MeshVertexLayout} vertexLayout
 */
export function createProgramFromSrc(gl, vshader, fshader, vertexLayout) {
  let v = createshader(gl, vshader, gl.VERTEX_SHADER)
  let f = createshader(gl, fshader, gl.FRAGMENT_SHADER)
  if (f == null || v == null) {
    gl.deleteShader(v)
    gl.deleteShader(f)
    return null
  }
  let program = createProgram(gl, v, f, vertexLayout)

  return program
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLShader} vshader 
 * @param {WebGLShader} fshader
 * @param {MeshVertexLayout} vertexLayout
 * 
 */
function createProgram(gl, vshader, fshader, vertexLayout) {
  let program = gl.createProgram()
  gl.attachShader(program, vshader)
  gl.attachShader(program, fshader)

  for (const layout of vertexLayout.layouts) {
    for (const attribute of layout.attributes) {
      gl.bindAttribLocation(program, attribute.id, attribute.name)
    }
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(`Program could not be linked: 
    ========================================
    ${gl.getProgramInfoLog(program)}
    `);
    gl.deleteProgram(program)
    return null
  }
  gl.validateProgram(program)
  const info = gl.getProgramInfoLog(program)?.trim()
  if (info) {
    console.log(`Program could not be validated: 
    ========================================
    ${info}
    `);
  }

  gl.useProgram(program)
  gl.detachShader(program, vshader)
  gl.detachShader(program, fshader)
  gl.deleteShader(vshader)
  gl.deleteShader(fshader)
  return {
    program,
    uniforms: getActiveUniforms(gl, program),
    uniformBlocks: getActiveUniformBlocks(gl, program)
  }
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program
 * @returns {Map<string,Uniform>}
 */
function getActiveUniforms(gl, program) {
  let textureUnit = 0
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const map = new Map()
  for (let i = 0; i < numUniforms; i++) {
    const info = gl.getActiveUniform(program, i)

    if (!info) continue

    const location = gl.getUniformLocation(program, info.name)
    const [blockIndex] = gl.getActiveUniforms(
      program,
      [i],
      gl.UNIFORM_BLOCK_INDEX
    )
    if (blockIndex !== -1 || !location) continue
    const uniform = new Uniform(
      location,
      info.type,
      info.size
    )

    switch (info.type) {
      case UniformType.Sampler2D:
      case UniformType.ISampler2D:
      case UniformType.USampler2D:
      case UniformType.Sampler2DShadow:
      case UniformType.Sampler2DArray:
      case UniformType.ISampler2DArray:
      case UniformType.USampler2DArray:
      case UniformType.Sampler2DArrayShadow:
      case UniformType.SamplerCube:
      case UniformType.ISamplerCube:
      case UniformType.USamplerCube:
      case UniformType.SamplerCubeShadow:
      case UniformType.Sampler3D:
      case UniformType.ISampler3D:
      case UniformType.USampler3D:
        uniform.texture_unit = textureUnit
        textureUnit += 1
        gl.uniform1i(location, uniform.texture_unit)
        break
    }
    map.set(info.name, uniform)
  }
  return map
}

/**
 * @param {WebGL2RenderingContext} gl 
 * @param {WebGLProgram} program 
 * @returns {Map<string,UniformBufferLayout>}
 */
function getActiveUniformBlocks(gl, program) {
  const results = new Map()
  const numBlocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);

  for (let i = 0; i < numBlocks; i++) {
    const name = gl.getActiveUniformBlockName(program, i);
    results.set(name, getUniformBufferLayout(gl, program, i))
  }
  return results
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLProgram} program
 * @param {number} index
 */
function getUniformBufferLayout(gl, program, index) {
  const size = gl.getActiveUniformBlockParameter(
    program,
    index,
    gl.UNIFORM_BLOCK_DATA_SIZE
  )
  const uniformIndices = gl.getActiveUniformBlockParameter(
    program,
    index,
    gl.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES
  )
  const offsets = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_OFFSET);
  const strides = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_ARRAY_STRIDE);
  const fields = new Map()

  uniformIndices.forEach((/** @type {number} */ index, /** @type {string | number} */ i) => {
    const info = gl.getActiveUniform(program, index)

    if (!info) {
      return
    }
    return fields.set(info.name, {
      type: info.type,
      size: info.size,
      offset: offsets[i],
      stride: strides[i]
    })
  });
  return new UniformBufferLayout("", size, fields)
}

/**
 * @param {WebGL2RenderingContext} gl
 * @param {string} src
 * @param {number} type
 */
function createshader(gl, src, type) {
  let shader = gl.createShader(type)

  assert(shader, "No shader created")

  gl.shaderSource(shader, src)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log(`Shader could not compile: 
    ${formatGlsl(src)}
    ========================================
    ${gl.getShaderInfoLog(shader)}
    `);
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * @param {string} code
 */
function formatGlsl(code) {
  const normalized = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n")

  return lines.map((ln, idx) => {
    const num = (idx + 1).toString()
    return `${num}: ${ln}`;
  })
    .join("\n");
}
