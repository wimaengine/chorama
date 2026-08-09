/**@import { WebGLRenderPipelineDescriptor } from '../core/index.js' */
/**@import { WebGLAtttributeParams } from '../function.js' */
/** @import { NewUniformBuffer } from "../core/resources/index.js" */

import { Texture } from "../texture/index.js"
import { Attribute, Mesh } from "../mesh/index.js"
import { GPUMesh, GPUTexture, GPUBuffer, MeshVertexLayout, WebGLRenderDevice, WebGLRenderPipeline } from "../core/index.js"
import { UniformBuffers } from "./uniformbuffers.js"
import { BufferType, BufferUsage } from "../constants/others.js"
import { mapToIndicesType, mapVertexFormatToWebGL } from "../function.js"
import { assert } from "../utils/index.js"
import { getVertexFormatComponentNumber, getVertexFormatComponentSize } from "../constants/mesh.js"

export class Caches {
  uniformBuffers = new UniformBuffers()
  /**
   * @type {Map<Mesh, GPUMesh>}
   */
  meshes = new Map()
  /**
   * @type {Map<Texture, GPUTexture>}
   */
  textures = new Map()

  /**
   * @type {Map<NewUniformBuffer, GPUBuffer>}
   */
  newUniformBuffers = new Map()

  /**
   * @type {WebGLRenderPipeline[]}
   */
  renderpipelines = []

  /**
   * @type {MeshVertexLayout[]}
   */
  meshLayouts = []

  /**
   * @param {WebGLRenderDevice} device
   * @param {Mesh} mesh
   * @param {ReadonlyMap<string, Attribute>} attributes
   */
  getMesh(device, mesh, attributes) {
    const gpuMesh = this.meshes.get(mesh)
    if (gpuMesh && !mesh.changed) {
      return gpuMesh
    }

    const [layout, layoutId] = this.getLayout(mesh, attributes)
    const vao = device.context.createVertexArray()
    const newMesh = new GPUMesh(vao, 0, layoutId)

    // Flush out any change detection that happened when the mesh was creates
    mesh.changed
    device.context.bindVertexArray(vao)
    updateVAO(device, layout, mesh, newMesh)
    this.meshes.set(mesh, newMesh)
    if (gpuMesh) {
      deleteMesh(device.context, gpuMesh)
    }

    return newMesh
  }

  /**
   * @param {Mesh} mesh
   * @param {ReadonlyMap<string, Attribute>} attributes
   * @returns {[MeshVertexLayout, number]}
   */
  getLayout(mesh, attributes) {
    for (let i = 0; i < this.meshLayouts.length; i++) {
      const layout = /**@type {MeshVertexLayout} */(this.meshLayouts[i])
      if (layout.compatibleWithMesh(mesh)) {
        return [layout, i]
      }
    }
    const layout = MeshVertexLayout.fromMesh(mesh, attributes)
    const newId = this.meshLayouts.length

    this.meshLayouts.push(layout)

    return [layout, newId]
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {Texture} texture
   * @returns {GPUTexture}
   */
  getTexture(device, texture) {
    const gpuTexture = this.textures.get(texture)

    if (gpuTexture) {
      if (texture.changed) {
        if (
          texture.type === gpuTexture.type &&
          texture.format === gpuTexture.actualFormat &&
          texture.width === gpuTexture.width &&
          texture.height === gpuTexture.height &&
          texture.depth === gpuTexture.depth
        ) {
          // non-structural change, no need to create new gpu texture

          if (texture.data) {
            device.writeTexture({
              texture: gpuTexture,
              data: texture.data
            })
          }
          return gpuTexture
        } else {
          device.context.deleteTexture(gpuTexture.inner)
        }
      } else {
        return gpuTexture
      }
    }

    const newTex = device.createTexture({
      type: texture.type,
      format: texture.format,
      width: texture.width,
      height: texture.height,
      depth: texture.depth,
    })

    if (texture.data) {
      device.writeTexture({
        texture: newTex,
        data: texture.data
      })
    }

    if (texture.generateMipmaps) {
      device.context.generateMipmap(texture.type)
    }

    // Flush out any change detection that happened when the image was creates
    texture.changed
    this.textures.set(texture, newTex)
    return newTex
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {NewUniformBuffer} uniformBuffer
   * @returns {GPUBuffer}
   */
  getNewUniformBuffer(device, uniformBuffer) {
    const gpuBuffer = this.newUniformBuffers.get(uniformBuffer)
    const data = uniformBuffer.data

    if (gpuBuffer) {
      if (uniformBuffer.changed) {
        if (gpuBuffer.size >= data.byteLength) {
          // non-structural change, no need to create new gpu buffer
          device.writeBuffer(gpuBuffer, data)
          return gpuBuffer
        } else {
          device.context.deleteBuffer(gpuBuffer.inner)
        }
      } else {
        return gpuBuffer
      }
    }

    const newBuffer = device.createBuffer({
      type: BufferType.Uniform,
      usage: BufferUsage.Dynamic,
      size: data.byteLength
    })

    uniformBuffer.changed
    device.writeBuffer(newBuffer, data)
    this.newUniformBuffers.set(uniformBuffer, newBuffer)
    return newBuffer
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {WebGLRenderPipelineDescriptor} descriptor
   * @returns {[WebGLRenderPipeline, number]}
   */
  createRenderPipeline(device, descriptor) {
    const id = this.renderpipelines.length
    const pipeline = device.createRenderPipeline(descriptor)

    for (const [name, uboLayout] of pipeline.uniformBlocks) {
      this.uniformBuffers.getorSet(device, name, uboLayout)
    }
    this.renderpipelines[id] = pipeline
    return [pipeline, id]
  }

  /**
   * @param {number} id
   * @returns {WebGLRenderPipeline | undefined}
   */
  getRenderPipeline(id) {
    return this.renderpipelines[id]
  }

  /**
   * @param {number} id
   */
  getMeshVertexLayout(id) {
    return this.meshLayouts[id]
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {MeshVertexLayout} layout
 * @param {Mesh} mesh
 * @param {GPUMesh} gpuMesh
 */
function updateVAO(device, layout, mesh, gpuMesh) {
  const { indices, attributes } = mesh
  let attrCount

  if (indices !== undefined) {
    const buffer = device.createBuffer({
      type: BufferType.ElementArray,
      usage: BufferUsage.Static,
      size: indices.byteLength
    })
    device.writeBuffer(buffer, indices)
    gpuMesh.indexType = mapToIndicesType(indices)
    gpuMesh.indexBuffer = buffer
  }

  for (const vertexLayout of layout.layouts) {
    const attribute = vertexLayout.attributes[0]

    assert(attribute, "The mesh vertex layout is incorrectly set up for the provided mesh.")

    const data = attributes.get(attribute.name)

    assert(data, `The provided mesh does not have the vertex attribute ${attribute.name}`)

    // This only works for separate buffers for each vertex attribute.
    const buffer = device.createBuffer({
      type: BufferType.Array,
      size: data.byteLength,
      usage: BufferUsage.Static
    })
    const params = mapVertexFormatToWebGL(attribute.format)
    const count = data.byteLength / (getVertexFormatComponentSize(attribute.format) * getVertexFormatComponentNumber(attribute.format))

    device.writeBuffer(buffer, data)
    setVertexAttribute(device.context, attribute.id, params)
    gpuMesh.attributeBuffers.push(buffer)

    if (attrCount) {
      if (count < attrCount) {
        attrCount = count
      }
    } else {
      attrCount = count
    }
  }

  if (indices) {
    gpuMesh.count = indices.length
  } else if (attrCount !== undefined) {
    gpuMesh.count = attrCount
  } else {
    gpuMesh.count = 0
  }
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {GPUMesh} gpuMesh
 */
function deleteMesh(context, gpuMesh) {
  for (const buffer of gpuMesh.attributeBuffers) {
    context.deleteBuffer(buffer.inner)
  }

  if (gpuMesh.indexBuffer) {
    context.deleteBuffer(gpuMesh.indexBuffer.inner)
  }

  context.deleteVertexArray(gpuMesh.inner)
}

/**
 * @param {WebGL2RenderingContext} context
 * @param {number} index
 * @param {WebGLAtttributeParams} params
 * @param {number} [stride = 0]
 * @param {number} [offset = 0]
 */
function setVertexAttribute(context, index, params, stride = 0, offset = 0) {
  const { type, size, normalized } = params
  context.enableVertexAttribArray(index)
  switch (type) {
    case WebGL2RenderingContext.FLOAT:
      context.vertexAttribPointer(index, size, type, normalized, stride, offset);
      break;
    case WebGL2RenderingContext.BYTE:
    case WebGL2RenderingContext.UNSIGNED_BYTE:
    case WebGL2RenderingContext.SHORT:
    case WebGL2RenderingContext.UNSIGNED_SHORT:
    case WebGL2RenderingContext.INT:
    case WebGL2RenderingContext.UNSIGNED_INT:
      if (normalized) {
        context.vertexAttribPointer(index, size, type, normalized, stride, offset);
      } else {
        context.vertexAttribIPointer(index, size, type, stride, offset);
      }
      break;
    default:
      throw new Error(`Unsupported GlDataType: ${type.toString()}`);
  }
}
