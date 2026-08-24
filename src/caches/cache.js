/**@import { WebGLRenderPipelineDescriptor } from '../core/index.js' */
/** @import { UniformBuffer } from "../core/resources/index.js" */
/** @import { Sampler } from "../texture/index.js" */
/** @import { WebGLSamplerDescriptor } from "../core/webgl/descriptors.js" */

import { Texture } from "../texture/index.js"
import { Attribute, Mesh } from "../mesh/index.js"
import { GPUMesh, GPUTexture, GPUBuffer, MeshVertexLayout, WebGLRenderDevice, WebGLRenderPipeline } from "../core/index.js"
import { BufferType, BufferUsage } from "../constants/others.js"
import { mapToIndexFormat } from "../function.js"
import { assert } from "../utils/index.js"
import { getVertexFormatComponentNumber, getVertexFormatComponentSize } from "../constants/mesh.js"

export class Caches {
  /**
   * @type {Map<Mesh, GPUMesh>}
   */
  meshes = new Map()
  /**
   * @type {Map<Texture, GPUTexture>}
   */
  textures = new Map()

  /**
   * @type {Map<Sampler, import("../core/resources/index.js").GPUSampler>}
   */
  samplers = new Map()

  /**
   * @type {Map<UniformBuffer, GPUBuffer>}
   */
  uniformBuffers = new Map()

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

    // Flush out any change detection that happened when the mesh was creates
    mesh.changed
    const newMesh = updateMesh(device, layout, mesh, layoutId)
    this.meshes.set(mesh, newMesh)
    if (gpuMesh) {
      gpuMesh.destroy()
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
    const mipmapCount = texture.data.length

    if (gpuTexture) {
      if (texture.changed) {
        if (
          texture.type === gpuTexture.type &&
          texture.format === gpuTexture.actualFormat &&
          texture.width === gpuTexture.width &&
          texture.height === gpuTexture.height &&
          texture.depth === gpuTexture.depth &&
          mipmapCount === gpuTexture.mipmapCount
        ) {
          // non-structural change, no need to create new gpu texture

          texture.data.forEach((data, mipmapLevel) => {
            if (data === undefined) {
              return
            }
            device.queue.writeTexture({
              texture: gpuTexture,
              data,
              mipmapLevel
            })
          })
          return gpuTexture
        } else {
          gpuTexture.destroy()
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
      mipmapCount
    })

    texture.data.forEach((data, mipmapLevel) => {
      if (data === undefined) {
        return
      }
      device.queue.writeTexture({
        texture: newTex,
        data,
        mipmapLevel
      })
    })
    // Flush out any change detection that happened when the image was creates
    texture.changed
    this.textures.set(texture, newTex)
    return newTex
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {Sampler} sampler
   * @returns {import("../core/resources/index.js").GPUSampler}
   */
  getSampler(device, sampler) {
    const gpuSampler = this.samplers.get(sampler)
    const changed = sampler.changed

    if (gpuSampler) {
      if (!changed) {
        return gpuSampler
      }

      const newSampler = device.createSampler(createSamplerDescriptor(sampler))
      gpuSampler.destroy()
      this.samplers.set(sampler, newSampler)
      return newSampler
    }

    const newSampler = device.createSampler(createSamplerDescriptor(sampler))
    this.samplers.set(sampler, newSampler)
    return newSampler
  }

  /**
   * @param {WebGLRenderDevice} device
   * @param {UniformBuffer} uniformBuffer
   * @returns {GPUBuffer}
   */
  getUniformBuffer(device, uniformBuffer) {
    const gpuBuffer = this.uniformBuffers.get(uniformBuffer)
    const data = uniformBuffer.data

    if (gpuBuffer) {
      if (uniformBuffer.changed) {
        if (gpuBuffer.size >= data.byteLength) {
          // non-structural change, no need to create new gpu buffer
          device.queue.writeBuffer(gpuBuffer, data)
          return gpuBuffer
        }
        gpuBuffer.destroy()
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
    device.queue.writeBuffer(newBuffer, data)
    this.uniformBuffers.set(uniformBuffer, newBuffer)
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
 * @param {Sampler} sampler
 * @returns {WebGLSamplerDescriptor}
 */
function createSamplerDescriptor(sampler) {
  return {
    magnificationFilter: sampler.magnificationFilter,
    minificationFilter: sampler.minificationFilter,
    mipmapFilter: sampler.mipmapFilter,
    wrapS: sampler.wrapS,
    wrapT: sampler.wrapT,
    wrapR: sampler.wrapR,
    lod: sampler.lod,
    anisotropy: sampler.anisotropy,
    compare: sampler.compare
  }
}

/**
 * @param {WebGLRenderDevice} device
 * @param {MeshVertexLayout} layout
 * @param {Mesh} mesh
 * @param {number} layoutId
 * @returns {GPUMesh}
 */
function updateMesh(device, layout, mesh, layoutId) {
  const { indices, attributes } = mesh
  let attrCount
  /** @type {{ buffer: GPUBuffer, offset: number, size: number }[]} */
  const vertexBuffers = []
  /** @type {GPUBuffer | undefined} */
  let indexBuffer
  /** @type {"uint16" | "uint32" | undefined} */
  let indexFormat

  if (indices !== undefined) {
    indexBuffer = device.createBuffer({
      type: BufferType.ElementArray,
      usage: BufferUsage.Static,
      size: indices.byteLength
    })
    device.queue.writeBuffer(indexBuffer, indices)
    indexFormat = mapToIndexFormat(indices)
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
    const count = data.byteLength / (getVertexFormatComponentSize(attribute.format) * getVertexFormatComponentNumber(attribute.format))

    device.queue.writeBuffer(buffer, data)
    vertexBuffers.push({
      buffer,
      offset: 0,
      size: data.byteLength
    })

    if (attrCount !== undefined) {
      if (count < attrCount) {
        attrCount = count
      }
    } else {
      attrCount = count
    }
  }

  if (indices) {
    return new GPUMesh({
      vertexBuffers,
      indexBuffer,
      indexFormat,
      count: indices.length,
      layoutHash: layoutId
    })
  } else if (attrCount !== undefined) {
    return new GPUMesh({
      vertexBuffers,
      indexBuffer,
      indexFormat,
      count: attrCount,
      layoutHash: layoutId
    })
  }
  return new GPUMesh({
    vertexBuffers,
    indexBuffer,
    indexFormat,
    count: 0,
    layoutHash: layoutId
  })
}
