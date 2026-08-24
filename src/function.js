import {
  GlDataType,
  VertexFormat,
  TextureFormat
} from "./constants/index.js"

// TODO: Use dataview instead of this
/**
 * Converts an ArrayBuffer to a corresponding TypedArray based on `GlDataType`.
 *
 * @param {ArrayBufferLike} buffer - The buffer to convert.
 * @param {GlDataType} dataType - One of the values from GlDataType.
 * @throws {Error} If `dataType` is unknown.
 */
export function convertBufferToTypedArray(
  buffer,
  dataType,
  offset = 0,
  length = buffer.byteLength
) {
  switch (dataType) {
    case GlDataType.Float:
      return new Float32Array(buffer, offset, length / Float32Array.BYTES_PER_ELEMENT);
    case GlDataType.UnsignedInt:
      return new Uint32Array(buffer, offset, length / Uint32Array.BYTES_PER_ELEMENT);
    case GlDataType.Int:
      return new Int32Array(buffer, offset, length / Int32Array.BYTES_PER_ELEMENT);
    case GlDataType.UnsignedShort:
      return new Uint16Array(buffer, offset, length / Uint16Array.BYTES_PER_ELEMENT);
    case GlDataType.Short:
      return new Int16Array(buffer, offset, length / Int16Array.BYTES_PER_ELEMENT);
    case GlDataType.UnsignedByte:
      return new Uint8Array(buffer, offset, length / Uint8Array.BYTES_PER_ELEMENT);
    case GlDataType.Byte:
      return new Int8Array(buffer, offset, length / Int8Array.BYTES_PER_ELEMENT);
    default:
      throw new Error(`Unsupported GL data type: 0x${dataType.toString(16)}`);
  }
}

/**
 * Returns a WebGL texture format configuration based on a custom texture format enum.
 *
 * @param {number} format - The custom TextureFormat enum value.
 * @returns {WebGLTextureFormat | undefined} The corresponding texture format, or undefined if not supported.
 */
export function getWebGLTextureFormat(format) {
  const gl = WebGL2RenderingContext
  switch (format) {
    // --- 8-bit ---
    case TextureFormat.R8Unorm:
      return new WebGLTextureFormat(gl.R8, gl.RED, gl.UNSIGNED_BYTE);
    case TextureFormat.R8Snorm:
      return new WebGLTextureFormat(gl.R8_SNORM, gl.RED, gl.BYTE);
    case TextureFormat.R8Uint:
      return new WebGLTextureFormat(gl.R8UI, gl.RED_INTEGER, gl.UNSIGNED_BYTE);
    case TextureFormat.R8Sint:
      return new WebGLTextureFormat(gl.R8I, gl.RED_INTEGER, gl.BYTE);

    // --- 16-bit ---
    case TextureFormat.R16Uint:
      return new WebGLTextureFormat(gl.R16UI, gl.RED_INTEGER, gl.UNSIGNED_SHORT);
    case TextureFormat.R16Sint:
      return new WebGLTextureFormat(gl.R16I, gl.RED_INTEGER, gl.SHORT);
    case TextureFormat.R16Float:
      return new WebGLTextureFormat(gl.R16F, gl.RED, gl.HALF_FLOAT);
    case TextureFormat.RG8Unorm:
      return new WebGLTextureFormat(gl.RG8, gl.RG, gl.UNSIGNED_BYTE);
    case TextureFormat.RG8Snorm:
      return new WebGLTextureFormat(gl.RG8_SNORM, gl.RG, gl.BYTE);
    case TextureFormat.RG8Uint:
      return new WebGLTextureFormat(gl.RG8UI, gl.RG_INTEGER, gl.UNSIGNED_BYTE);
    case TextureFormat.RG8Sint:
      return new WebGLTextureFormat(gl.RG8I, gl.RG_INTEGER, gl.BYTE);

    // --- 32-bit ---
    case TextureFormat.R32Uint:
      return new WebGLTextureFormat(gl.R32UI, gl.RED_INTEGER, gl.UNSIGNED_INT);
    case TextureFormat.R32Sint:
      return new WebGLTextureFormat(gl.R32I, gl.RED_INTEGER, gl.INT);
    case TextureFormat.R32Float:
      return new WebGLTextureFormat(gl.R32F, gl.RED, gl.FLOAT);
    case TextureFormat.RG16Uint:
      return new WebGLTextureFormat(gl.RG16UI, gl.RG_INTEGER, gl.UNSIGNED_SHORT);
    case TextureFormat.RG16Sint:
      return new WebGLTextureFormat(gl.RG16I, gl.RG_INTEGER, gl.SHORT);
    case TextureFormat.RG16Float:
      return new WebGLTextureFormat(gl.RG16F, gl.RG, gl.HALF_FLOAT);
    case TextureFormat.RGBA8Unorm:
      return new WebGLTextureFormat(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    case TextureFormat.RGBA8UnormSRGB:
      return new WebGLTextureFormat(gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE);
    case TextureFormat.RGBA8Snorm:
      return new WebGLTextureFormat(gl.RGBA8_SNORM, gl.RGBA, gl.BYTE);
    case TextureFormat.RGBA8Uint:
      return new WebGLTextureFormat(gl.RGBA8UI, gl.RGBA_INTEGER, gl.UNSIGNED_BYTE);
    case TextureFormat.RGBA8Sint:
      return new WebGLTextureFormat(gl.RGBA8I, gl.RGBA_INTEGER, gl.BYTE);

    // --- 64-bit ---
    case TextureFormat.RG32Uint:
      return new WebGLTextureFormat(gl.RG32UI, gl.RG_INTEGER, gl.UNSIGNED_INT);
    case TextureFormat.RG32Sint:
      return new WebGLTextureFormat(gl.RG32I, gl.RG_INTEGER, gl.INT);
    case TextureFormat.RG32Float:
      return new WebGLTextureFormat(gl.RG32F, gl.RG, gl.FLOAT);
    case TextureFormat.RGBA16Uint:
      return new WebGLTextureFormat(gl.RGBA16UI, gl.RGBA_INTEGER, gl.UNSIGNED_SHORT);
    case TextureFormat.RGBA16Sint:
      return new WebGLTextureFormat(gl.RGBA16I, gl.RGBA_INTEGER, gl.SHORT);
    case TextureFormat.RGBA16Float:
      return new WebGLTextureFormat(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT);

    // --- 128-bit ---
    case TextureFormat.RGBA32Uint:
      return new WebGLTextureFormat(gl.RGBA32UI, gl.RGBA_INTEGER, gl.UNSIGNED_INT);
    case TextureFormat.RGBA32Sint:
      return new WebGLTextureFormat(gl.RGBA32I, gl.RGBA_INTEGER, gl.INT);
    case TextureFormat.RGBA32Float:
      return new WebGLTextureFormat(gl.RGBA32F, gl.RGBA, gl.FLOAT);

    // --- Depth / Stencil ---
    case TextureFormat.Depth16Unorm:
      return new WebGLTextureFormat(gl.DEPTH_COMPONENT16, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT);
    case TextureFormat.Depth24Plus:
      return new WebGLTextureFormat(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);
    case TextureFormat.Depth32Float:
      return new WebGLTextureFormat(gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT);
    case TextureFormat.Depth24PlusStencil8:
      return new WebGLTextureFormat(gl.DEPTH24_STENCIL8, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8);
    case TextureFormat.Depth32FloatStencil8:
      return new WebGLTextureFormat(gl.DEPTH32F_STENCIL8, gl.DEPTH_STENCIL, gl.FLOAT_32_UNSIGNED_INT_24_8_REV);

    default:
      return undefined;
  }
}

/**
 * Converts a TextureFormat enum value to the appropriate framebuffer attachment type.
 * @param {number} format - A value from TextureFormat.
 * @returns {number} A GL_* attachment enum, e.g. gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT, etc.
 */
export function getFramebufferAttachment(format) {
  const context = WebGL2RenderingContext;

  switch (format) {
    // --- Depth-only formats ---
    case TextureFormat.Depth16Unorm:
    case TextureFormat.Depth24Plus:
    case TextureFormat.Depth32Float:
      return context.DEPTH_ATTACHMENT;

    // --- Stencil-only format ---
    case TextureFormat.Stencil8:
      return context.STENCIL_ATTACHMENT;

    // --- Combined depth + stencil formats ---
    case TextureFormat.Depth24PlusStencil8:
    case TextureFormat.Depth32FloatStencil8:
      return context.DEPTH_STENCIL_ATTACHMENT;

    // --- Everything else is a color attachment ---
    default:
      return context.COLOR_ATTACHMENT0;
  }
}


/**
 * @param {GLenum} attachment
 */
export function mapWebGLAttachmentToBufferBit(attachment) {
  switch (attachment) {
      case WebGL2RenderingContext.COLOR_ATTACHMENT0:
          return WebGL2RenderingContext.COLOR_BUFFER_BIT;
      case WebGL2RenderingContext.DEPTH_ATTACHMENT:
          return WebGL2RenderingContext.DEPTH_BUFFER_BIT;
      case WebGL2RenderingContext.STENCIL_ATTACHMENT:
          return WebGL2RenderingContext.STENCIL_BUFFER_BIT;
      case WebGL2RenderingContext.DEPTH_STENCIL_ATTACHMENT:
          return WebGL2RenderingContext.DEPTH_BUFFER_BIT | WebGLRenderingContext.STENCIL_BUFFER_BIT;
      default:
          throw new Error("Unsupported attachment type");
  }
}


/**
 * Maps a `VertexFormat` variant to WebGL format attributes for use in `vertexAttribPointer` or equivalent functions.
 * @param {VertexFormat} format
 * @returns {WebGLAtttributeParams}
 */
export function mapVertexFormatToWebGL(format) {
  const gl = WebGL2RenderingContext
  switch (format) {
    // 8-bit int
    case VertexFormat.Uint8:
      return { size: 1, type: gl.UNSIGNED_BYTE, normalized: false };
    case VertexFormat.Uint8x2:
      return { size: 2, type: gl.UNSIGNED_BYTE, normalized: false };
    case VertexFormat.Uint8x3:
      return { size: 3, type: gl.UNSIGNED_BYTE, normalized: false };
    case VertexFormat.Uint8x4:
      return { size: 4, type: gl.UNSIGNED_BYTE, normalized: false };

    case VertexFormat.Unorm8:
      return { size: 1, type: gl.UNSIGNED_BYTE, normalized: true };
    case VertexFormat.Unorm8x2:
      return { size: 2, type: gl.UNSIGNED_BYTE, normalized: true };
    case VertexFormat.Unorm8x3:
      return { size: 3, type: gl.UNSIGNED_BYTE, normalized: true };
    case VertexFormat.Unorm8x4:
      return { size: 4, type: gl.UNSIGNED_BYTE, normalized: true };

    case VertexFormat.Snorm8:
      return { size: 1, type: gl.BYTE, normalized: true };
    case VertexFormat.Snorm8x2:
      return { size: 2, type: gl.BYTE, normalized: true };
    case VertexFormat.Snorm8x3:
      return { size: 3, type: gl.BYTE, normalized: true };
    case VertexFormat.Snorm8x4:
      return { size: 4, type: gl.BYTE, normalized: true };

    case VertexFormat.Sint8:
      return { size: 1, type: gl.BYTE, normalized: false };
    case VertexFormat.Sint8x2:
      return { size: 2, type: gl.BYTE, normalized: false };
    case VertexFormat.Sint8x3:
      return { size: 3, type: gl.BYTE, normalized: false };
    case VertexFormat.Sint8x4:
      return { size: 4, type: gl.BYTE, normalized: false };

    // 16-bit int
    case VertexFormat.Uint16:
      return { size: 1, type: gl.UNSIGNED_SHORT, normalized: false };
    case VertexFormat.Uint16x2:
      return { size: 2, type: gl.UNSIGNED_SHORT, normalized: false };
    case VertexFormat.Uint16x3:
      return { size: 3, type: gl.UNSIGNED_SHORT, normalized: false };
    case VertexFormat.Uint16x4:
      return { size: 4, type: gl.UNSIGNED_SHORT, normalized: false };

    case VertexFormat.Unorm16:
      return { size: 1, type: gl.UNSIGNED_SHORT, normalized: true };
    case VertexFormat.Unorm16x2:
      return { size: 2, type: gl.UNSIGNED_SHORT, normalized: true };
    case VertexFormat.Unorm16x3:
      return { size: 3, type: gl.UNSIGNED_SHORT, normalized: true };
    case VertexFormat.Unorm16x4:
      return { size: 4, type: gl.UNSIGNED_SHORT, normalized: true };

    case VertexFormat.Snorm16:
      return { size: 1, type: gl.SHORT, normalized: true };
    case VertexFormat.Snorm16x2:
      return { size: 2, type: gl.SHORT, normalized: true };
    case VertexFormat.Snorm16x3:
      return { size: 3, type: gl.SHORT, normalized: true };
    case VertexFormat.Snorm16x4:
      return { size: 4, type: gl.SHORT, normalized: true };

    case VertexFormat.Sint16:
      return { size: 1, type: gl.SHORT, normalized: false };
    case VertexFormat.Sint16x2:
      return { size: 2, type: gl.SHORT, normalized: false };
    case VertexFormat.Sint16x3:
      return { size: 3, type: gl.SHORT, normalized: false };
    case VertexFormat.Sint16x4:
      return { size: 4, type: gl.SHORT, normalized: false };

    // 32-bit int
    case VertexFormat.Uint32:
      return { size: 1, type: gl.UNSIGNED_INT, normalized: false };
    case VertexFormat.Uint32x2:
      return { size: 2, type: gl.UNSIGNED_INT, normalized: false };
    case VertexFormat.Uint32x3:
      return { size: 3, type: gl.UNSIGNED_INT, normalized: false };
    case VertexFormat.Uint32x4:
      return { size: 4, type: gl.UNSIGNED_INT, normalized: false };

    case VertexFormat.Sint32:
      return { size: 1, type: gl.INT, normalized: false };
    case VertexFormat.Sint32x2:
      return { size: 2, type: gl.INT, normalized: false };
    case VertexFormat.Sint32x3:
      return { size: 3, type: gl.INT, normalized: false };
    case VertexFormat.Sint32x4:
      return { size: 4, type: gl.INT, normalized: false };

    // 32-bit floating point
    case VertexFormat.Float32:
      return { size: 1, type: gl.FLOAT, normalized: false };
    case VertexFormat.Float32x2:
      return { size: 2, type: gl.FLOAT, normalized: false };
    case VertexFormat.Float32x3:
      return { size: 3, type: gl.FLOAT, normalized: false };
    case VertexFormat.Float32x4:
      return { size: 4, type: gl.FLOAT, normalized: false };

    default:
      throw new Error(`Unsupported VertexFormat: ${format}`);
  }
}

/**
 * @param {Uint16Array | Uint32Array} indices
 * @returns {"uint16" | "uint32"}
 */
export function mapToIndexFormat(indices) {
  if (indices instanceof Uint16Array) {
    return "uint16"
  }
  if (indices instanceof Uint32Array) {
    return "uint32"
  }
  throw "This is unreachable!"
}

/**
 * @typedef WebGLAtttributeParams
 * @property {number} size
 * @property {GLenum} type
 * @property {boolean} normalized
 */

/**
 * Represents a WebGL texture format configuration.
 */
export class WebGLTextureFormat {
  /**
   * @type {GLenum} Internal format of the texture (e.g., gl.RGBA8)
   */
  internalFormat;

  /**
   * @type {GLenum} Format of the pixel data (e.g., gl.RGBA)
   */
  format;

  /**
   * @type {GLenum} Data type of the pixel data (e.g., gl.UNSIGNED_BYTE)
   */
  dataType;

  /**
   * Creates a WebGLTextureFormat instance.
   * @param {GLenum} internalFormat - The internal format of the texture.
   * @param {GLenum} format - The format of the pixel data.
   * @param {GLenum} dataType - The data type of the pixel data.
   */
  constructor(internalFormat, format, dataType) {
    this.internalFormat = internalFormat;
    this.format = format;
    this.dataType = dataType;
  }
}
