/**
 * @enum {number}
 */
export const TextureFormat = /** @type {const} */({
  // --- 8-bit ---
  R8Unorm: 1,
  R8Snorm: 2,
  R8Uint: 3,
  R8Sint: 4,

  // --- 16-bit ---
  R16Uint: 5,
  R16Sint: 6,
  R16Float: 7,
  RG8Unorm: 8,
  RG8Snorm: 9,
  RG8Uint: 10,
  RG8Sint: 11,

  // --- 32-bit ---
  R32Uint: 12,
  R32Sint: 13,
  R32Float: 14,
  RG16Uint: 15,
  RG16Sint: 16,
  RG16Float: 17,
  RGBA8Unorm: 18,
  RGBA8UnormSRGB: 19,
  RGBA8Snorm: 20,
  RGBA8Uint: 21,
  RGBA8Sint: 22,

  // --- 64-bit ---
  RG32Uint: 23,
  RG32Sint: 24,
  RG32Float: 25,
  RGBA16Uint: 26,
  RGBA16Sint: 27,
  RGBA16Float: 28,

  // --- 128-bit ---
  RGBA32Uint: 29,
  RGBA32Sint: 30,
  RGBA32Float: 31,

  // --- Depth / Stencil ---
  Stencil8: 32,
  Depth16Unorm: 33,
  Depth24Plus: 34,
  Depth24PlusStencil8: 35,
  Depth32Float: 36,
  Depth32FloatStencil8: 37,
})

/**
 * @enum {number}
 */
export const TextureFilter = /** @type {const} */({
  Nearest: 0x2600,
  Linear: 0x2601
})

/**
 * @enum {number}
 */
export const TextureWrap = /** @type {const} */({
  Repeat: 0x2901,
  Clamp: 0x812F,
  MirrorRepeat: 0x8370
})

/**
 * @enum {number}
 * Texture binding targets
 */
export const TextureType = /** @type {const} */({
  Texture2D: 0x0DE1,         // gl.TEXTURE_2D
  Texture2DArray: 0x8C1A,    // gl.TEXTURE_2D_ARRAY
  Texture3D: 0x806F,         // gl.TEXTURE_3D
  TextureCubeMap: 0x8513     // gl.TEXTURE_CUBE_MAP
})

/**
 * Returns the size in bytes per texel for a given TextureFormat.
 * @param {TextureFormat} format
 * @returns {number}
 */
export function getTextureFormatSize(format) {
  switch (format) {
    // 8-bit = 1 byte
    case TextureFormat.R8Unorm:
    case TextureFormat.R8Snorm:
    case TextureFormat.R8Uint:
    case TextureFormat.R8Sint:
      return 1;

    // 16-bit = 2 bytes
    case TextureFormat.R16Uint:
    case TextureFormat.R16Sint:
    case TextureFormat.R16Float:
    case TextureFormat.RG8Unorm:
    case TextureFormat.RG8Snorm:
    case TextureFormat.RG8Uint:
    case TextureFormat.RG8Sint:
      return 2;

    // 32-bit = 4 bytes
    case TextureFormat.R32Uint:
    case TextureFormat.R32Sint:
    case TextureFormat.R32Float:
    case TextureFormat.RG16Uint:
    case TextureFormat.RG16Sint:
    case TextureFormat.RG16Float:
    case TextureFormat.RGBA8Unorm:
    case TextureFormat.RGBA8UnormSRGB:
    case TextureFormat.RGBA8Snorm:
    case TextureFormat.RGBA8Uint:
    case TextureFormat.RGBA8Sint:
      return 4;

    // 64-bit = 8 bytes
    case TextureFormat.RG32Uint:
    case TextureFormat.RG32Sint:
    case TextureFormat.RG32Float:
    case TextureFormat.RGBA16Uint:
    case TextureFormat.RGBA16Sint:
    case TextureFormat.RGBA16Float:
      return 8;

    // 128-bit = 16 bytes
    case TextureFormat.RGBA32Uint:
    case TextureFormat.RGBA32Sint:
    case TextureFormat.RGBA32Float:
      return 16;

    // Depth/stencil formats — size varies and is implementation-specific
    case TextureFormat.Stencil8:
      return 1;
    case TextureFormat.Depth16Unorm:
      return 2;
    case TextureFormat.Depth24Plus:
    case TextureFormat.Depth24PlusStencil8:
      return 4; // Typically 3 or 4 bytes — assume 4
    case TextureFormat.Depth32Float:
      return 4;
    case TextureFormat.Depth32FloatStencil8:
      return 5; // 4 (depth) + 1 (stencil) — approximate

    default:
      throw new Error(`Unknown or unsupported texture format: ${format}`);
  }
}

/**
 * @param {TextureFormat} format
 */
export function hasDepthComponent(format) {
  switch (format) {
    case TextureFormat.Depth16Unorm:
    case TextureFormat.Depth24Plus:
    case TextureFormat.Depth24PlusStencil8:
    case TextureFormat.Depth32Float:
    case TextureFormat.Depth32FloatStencil8:
      return true;
    default:
      return false;
  }
}

/**
 * Checks if a format has a stencil component
 * @param {TextureFormat} format
 */
export function hasStencilComponent(format) {
  switch (format) {
    case TextureFormat.Stencil8:
    case TextureFormat.Depth24PlusStencil8:
    case TextureFormat.Depth32FloatStencil8:
      return true;
    default:
      return false;
  }
}
