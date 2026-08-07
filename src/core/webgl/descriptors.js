import { BufferUsage, BufferType, TextureType, TextureFormat, CullFace, FrontFaceDirection, PrimitiveTopology } from "../../constants/index.js";
import { Vector3 } from "../../math/index.js";
import { ViewRectangle } from "../../utils/index.js";
import { CompareFunction } from "../constants.js";
import { MeshVertexLayout } from "../layouts/index.js";
import { BlendParams, GPUTexture } from "../resources/index.js";
import { Shader } from "../shader.js";
/** @import { GPUBuffer } from "../resources/index.js" */
/** @import { Sampler } from "../../texture/index.js" */

/**
 * @typedef {"load" | "clear"} WebGLLoadOp
 */

/**
 * @typedef {"store" | "discard"} WebGLStoreOp
 */

/**
 * @typedef {readonly [number, number, number, number]} WebGLColorValue
 */

/**
 * WebGPU-shaped render pass descriptor. Texture attachments are bound to the
 * render device's reusable draw framebuffer at pass begin.
 * @typedef WebGLRenderPassDescriptor
 * @property {number} width
 * @property {number} height
 * @property {boolean} [defaultFramebuffer]
 * @property {readonly (WebGLRenderPassColorAttachment | null)[]} colorAttachments
 * @property {WebGLRenderPassDepthStencilAttachment} [depthStencilAttachment]
 * @property {ViewRectangle} [viewport]
 * @property {ViewRectangle} [scissor]
 */

/**
 * @typedef WebGLRenderPassColorAttachment
 * @property {GPUTexture} [texture]
 * @property {number} [mipLevel]
 * @property {number} [layer]
 * @property {WebGLLoadOp} loadOp
 * @property {WebGLStoreOp} storeOp
 * @property {WebGLColorValue} [clearValue]
 */

/**
 * @typedef WebGLRenderPassDepthStencilAttachment
 * @property {GPUTexture} [texture]
 * @property {number} [mipLevel]
 * @property {number} [layer]
 * @property {number} [depthClearValue]
 * @property {WebGLLoadOp} [depthLoadOp]
 * @property {WebGLStoreOp} [depthStoreOp]
 * @property {boolean} [depthReadOnly]
 * @property {number} [stencilClearValue]
 * @property {WebGLLoadOp} [stencilLoadOp]
 * @property {WebGLStoreOp} [stencilStoreOp]
 * @property {boolean} [stencilReadOnly]
 */

/**
 * @typedef WebGLBindGroupDescriptor
 * @property {string} [label]
 * @property {import("../layouts/bindgroup.js").WebGLBindGroupLayout} layout
 * @property {WebGLBindGroupEntry[]} entries
 */

/**
 * @typedef WebGLBindGroupEntry
 * @property {number} binding
 * @property {WebGLBindGroupResource} resource
 */

/**
 * @typedef WebGLBindGroupBufferResource
 * @property {GPUBuffer} buffer
 * @property {number} [offset]
 * @property {number} [size]
 */

/**
 * @typedef WebGLBindGroupTextureResource
 * @property {GPUTexture} texture
 * @property {Sampler} [sampler]
 */

/**
 * @typedef WebGLBindGroupSamplerResource
 * @property {Sampler} sampler
 */

/**
 * @typedef {WebGLBindGroupBufferResource | WebGLBindGroupTextureResource | WebGLBindGroupSamplerResource} WebGLBindGroupResource
 */

/**
 * @typedef WebGLBufferDescriptor
 * @property {number} size
 * @property {BufferUsage} usage
 * @property {BufferType} type
 */

/**
 * @typedef WebGLTextureDescriptor
 * @property {TextureType} type
 * @property {TextureFormat} format
 * @property {number} width
 * @property {number} height
 * @property {number} [depth = 1]
 * @property {number} [mipmapCount = 1]
 */

/**
 * @typedef WebGLWriteTextureDescriptor
 * @property {GPUTexture} texture
 * @property {ArrayBufferLike} data
 * @property {number} [mipmapLevel]
 * @property {Vector3} [offset]
 * @property {Vector3} [size]
 */

/**
 * @typedef WebGLRenderPipelineDescriptor
 * @property {import("../layouts/index.js").WebGLPipelineLayout} [layout]
 * @property {Shader} vertex
 * @property {{ source: Shader, targets:RenderTargetDescriptor[]}} [fragment]
 * @property {MeshVertexLayout} vertexLayout
 * @property {PrimitiveTopology} topology
 * @property {CullFace} [cullFace]
 * @property {boolean} [depthWrite]
 * @property {CompareFunction} [depthCompare]
 * @property {FrontFaceDirection} [frontFace]
 */

/**
 * @typedef RenderTargetDescriptor
 * @property {TextureFormat} format
 * @property {BlendDescriptor} [blend]
 */

/**
 * @typedef BlendDescriptor
 * @property {BlendParams} color
 * @property {BlendParams} alpha
 */
export default {}
