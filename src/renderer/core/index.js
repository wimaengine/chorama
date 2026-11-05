/** @import { Texture } from "../../texture/index.js" */
import { GPUMesh } from "../../core/index.js"
import { Affine3, Frustum, Matrix4, Vector3 } from "../../math/index.js"
import { Object3D, RenderMask } from "../../objects/index.js"
import { RenderTarget } from "../../rendertarget/index.js"
import { assert } from "../../utils/index.js"
import { Range, ViewRectangle } from "../../utils/index.js"

/**
 * @typedef {(renderer: import("../renderer.js").WebGLRenderer, view: View) => import("../../core/index.js").WebGLBindGroup} RenderBindingResolver
 */

export class View {
  /**
   * @type {RenderStage<MeshRenderItem>}
   */
  opaque3D = new RenderStage()
  /**
   * @type {RenderStage<MeshRenderItem>}
   */
  alphaMask3D = new RenderStage()
  /**
   * @type {SortedRenderStage<MeshRenderItem>}
   */
  transparent3D = new SortedRenderStage()
  /**
   * @type {RenderStage<MeshRenderItem>}
   */
  opaque2D = new RenderStage()
  /**
   * @type {RenderStage<MeshRenderItem>}
   */
  alphaMask2D = new RenderStage()
  /**
   * @type {SortedRenderStage<MeshRenderItem>}
   */
  transparent2D = new SortedRenderStage()
  /**
   * @type {number}
   */
  order = 0
  /**
   * @type {RenderTarget | undefined}
   */
  renderTarget

  /**
   * @type {ViewRectangle}
   */
  viewport = new ViewRectangle()

  /**
   * @type {ViewRectangle | undefined}
   */
  scissor

  /**
   * @type {Range}
   */
  depthRange = new Range()

  /**
   * @type {number}
   */
  colorLayer = 0

  /**
   * @type {number}
   */
  depthLayer = 0

  /**
   * @type {number}
   */
  colorMipmapLevel = 0

  /**
   * @type {number}
   */
  depthMipmapLevel = 0

  /**
   * Dedicated depth texture for the view.
   * @type {Texture | undefined}
   */
  depthTexture

  /**
   * @type {Matrix4}
   */
  projectionMatrix

  /**
   * @type {Matrix4}
   */
  viewMatrix

  /**
   * @type {Vector3}
   */
  viewPosition

  /** @type {Frustum} */
  frustum = new Frustum()

  /**
   * @type {number}
   */
  near

  /**
   * @type {number}
   */
  far

  /**
   * @type {string}
   */
  tag
  /**
   * Render mask used to filter visible objects for this view.
   * @type {RenderMask}
   */
  renderMask = new RenderMask()
  /**
   * Source object that created this view.
   * @type {Object3D | undefined}
   */
  object

  /**
   * @param {ViewOptions} options
   */
  constructor({
    renderTarget,
    depthTexture,
    viewport = new ViewRectangle(),
    scissor,
    depthRange = new Range(),
    colorLayer = 0,
    depthLayer = 0,
    colorMipmapLevel = 0,
    depthMipmapLevel = 0,
    position,
    projection,
    view,
    near,
    far,
    tag,
    object,
    renderMask = new RenderMask()
  }) {
    this.renderTarget = renderTarget
    this.viewport = new ViewRectangle()
    this.viewport.copy(viewport)
    if (scissor) {
      this.scissor = new ViewRectangle()
      this.scissor.copy(scissor)
    } else {
      this.scissor = undefined
    }
    this.depthRange = new Range()
    this.depthRange.copy(depthRange)
    this.colorLayer = colorLayer
    this.depthLayer = depthLayer
    this.colorMipmapLevel = colorMipmapLevel
    this.depthMipmapLevel = depthMipmapLevel
    this.near = near
    this.far = far
    this.tag = tag
    this.projectionMatrix = projection
    this.viewMatrix = view
    this.viewPosition = position
    this.depthTexture = depthTexture
    this.object = object
    this.renderMask.copy(renderMask)

    const viewProjection = Matrix4.multiply(this.projectionMatrix, this.viewMatrix)
    this.frustum.setFromMatrix(viewProjection)
  }

  /**
   * Packs the view block into the supplied buffer slice.
   *
   * @param {DataView} data
   */
  getData(data) {
    const floats = new Float32Array(data.buffer, data.byteOffset, View.BlockSize / Float32Array.BYTES_PER_ELEMENT)
    const viewMatrix = this.viewMatrix
    const projectionMatrix = this.projectionMatrix
    const viewPosition = this.viewPosition

    floats[0] = viewMatrix.a
    floats[1] = viewMatrix.b
    floats[2] = viewMatrix.c
    floats[3] = viewMatrix.d
    floats[4] = viewMatrix.e
    floats[5] = viewMatrix.f
    floats[6] = viewMatrix.g
    floats[7] = viewMatrix.h
    floats[8] = viewMatrix.i
    floats[9] = viewMatrix.j
    floats[10] = viewMatrix.k
    floats[11] = viewMatrix.l
    floats[12] = viewMatrix.m
    floats[13] = viewMatrix.n
    floats[14] = viewMatrix.o
    floats[15] = viewMatrix.p
    floats[16] = projectionMatrix.a
    floats[17] = projectionMatrix.b
    floats[18] = projectionMatrix.c
    floats[19] = projectionMatrix.d
    floats[20] = projectionMatrix.e
    floats[21] = projectionMatrix.f
    floats[22] = projectionMatrix.g
    floats[23] = projectionMatrix.h
    floats[24] = projectionMatrix.i
    floats[25] = projectionMatrix.j
    floats[26] = projectionMatrix.k
    floats[27] = projectionMatrix.l
    floats[28] = projectionMatrix.m
    floats[29] = projectionMatrix.n
    floats[30] = projectionMatrix.o
    floats[31] = projectionMatrix.p
    floats[32] = viewPosition.x
    floats[33] = viewPosition.y
    floats[34] = viewPosition.z
    floats[35] = this.near
    floats[36] = this.far
  }
  /**
   * Raw packed payload size before std140 padding is applied.
   * @readonly
   * @type {number}
   */
  static BlockSize = 37 * Float32Array.BYTES_PER_ELEMENT

}

/**
 * A collection of bindings owned by one render item.
 */
export class RenderBindingSet {
  /**
   * @type {Map<number, { resolver: RenderBindingResolver | import("../../core/index.js").WebGLBindGroup, dynamicOffsets: number[] }>}
   */
  #bindings = new Map()

  /**
   * Sets a binding resolver.
   *
   * @param {number} group
   * @param {RenderBindingResolver | import("../../core/index.js").WebGLBindGroup} resolver
   * @param {number[]} [dynamicOffsets]
   * @returns {this}
   */
  set(group, resolver, dynamicOffsets = []) {
    this.#bindings.set(group, { resolver, dynamicOffsets })
    return this
  }

  /**
   * Removes one binding from the set.
   *
   * @param {number} group
   * @returns {boolean}
   */
  delete(group) {
    return this.#bindings.delete(group)
  }

  /**
   * Applies every available binding to a render pass.
   *
   * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
   * @param {import("../renderer.js").WebGLRenderer} renderer
   * @param {View} view
   */
  apply(pass, renderer, view) {
    const bindings = [...this.#bindings.entries()].sort(([a], [b]) => a - b)

    for (const [group, binding] of bindings) {
      const bindGroup = typeof binding.resolver === "function"
        ? binding.resolver(renderer, view)
        : binding.resolver
      pass.setBindGroup(group, bindGroup, binding.dynamicOffsets)
    }
  }
}

/**
 * Common state shared by all render item kinds.
 */
export class RenderItem {
  /** @type {number} */
  pipelineId

  /** @type {string} */
  tag

  /** @type {RenderBindingSet} */
  bindings

  /**
   * @param {{ pipelineId: number, tag: string, bindings?: RenderBindingSet }} options
   */
  constructor({ pipelineId, tag, bindings = new RenderBindingSet() }) {
    this.pipelineId = pipelineId
    this.tag = tag
    this.bindings = bindings
  }
}

/**
 * Per-view render stage for one material phase.
 *
 * @template {MeshRenderItem} T
 */
export class RenderStage {
  /**
   * @type {T[]}
   */
  meshItems = []

  /**
   * @type {NonMeshRenderItem[]}
   */
  nonMeshItems = []

  /**
   * @param {T | NonMeshRenderItem} item
   */
  add(item) {
    if (item instanceof NonMeshRenderItem) {
      this.nonMeshItems.push(item)
      return
    }

    this.meshItems.push(item)
  }
  clear() {
    this.meshItems.length = 0
    this.nonMeshItems.length = 0
  }

  /**
   * Returns mesh items in the order they should be prepared and drawn.
   *
   * @param {View} _view
   * @returns {MeshRenderItem[]}
   */
  getMeshItems(_view) {
    return this.meshItems
  }

  /**
   * Returns non-mesh items in the order they should be drawn.
   *
   * @param {View} _view
   * @returns {NonMeshRenderItem[]}
   */
  getNonMeshItems(_view) {
    return this.nonMeshItems
  }

  /**
   * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
   * @param {import("../renderer.js").WebGLRenderer} renderer
   * @param {View} view
   */
  renderItems(pass, renderer, view) {
    const meshItems = this.getMeshItems(view)
    const nonMeshItems = this.getNonMeshItems(view)

    for (let i = 0; i < meshItems.length; i++) {
      const meshItem = /** @type {MeshRenderItem} */ (meshItems[i])

      drawMeshRenderItem(pass, renderer, view, meshItem)
    }

    for (let i = 0; i < nonMeshItems.length; i++) {
      const nonMeshItem = /** @type {NonMeshRenderItem} */ (nonMeshItems[i])

      drawNonMeshRenderItem(pass, renderer, view, nonMeshItem)
    }
  }
}

/**
 * @template {MeshRenderItem} T
 * @extends {RenderStage<T>}
 */
export class SortedRenderStage extends RenderStage {
  /**
   * Returns mesh items back-to-front using the supplied view as the sorting reference.
   * @override
   * @param {View} view
   * @returns {T[]}
   */
  getMeshItems(view) {
    return this.meshItems
      .map((item, index) => ({
        item,
        index,
        depth: getViewSpaceDepth(view, item)
      }))
      .sort((a, b) => a.depth - b.depth || a.index - b.index)
      .map((entry) => entry.item)
  }
}

/**
 * @param {View} view
 * @param {MeshRenderItem} item
 */
function getViewSpaceDepth(view, item) {
  const { viewMatrix } = view
  const transform = item.transform

  return (
    viewMatrix.c * transform.x +
    viewMatrix.g * transform.y +
    viewMatrix.k * transform.z +
    viewMatrix.o
  )
}

/**
 * Draws a mesh render item using its own binding set.
 *
 * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
 * @param {import("../renderer.js").WebGLRenderer} renderer
 * @param {View} view
 * @param {MeshRenderItem} item
 */
export function drawMeshRenderItem(pass, renderer, view, item) {
  const { caches } = renderer
  const { pipelineId, mesh } = item
  const pipeline = caches.getRenderPipeline(pipelineId)

  if (!pipeline) {
    return
  }

  pass.setPipeline(pipeline)
  item.bindings.apply(pass, renderer, view)

  for (let slot = 0; slot < mesh.vertexBuffers.length; slot++) {
    const binding = mesh.vertexBuffers[slot]

    if (!binding) {
      continue
    }

    pass.setVertexBuffer(slot, binding.buffer, binding.offset, binding.size)
  }

  if (mesh.indexBuffer) {
    assert(mesh.indexFormat, "Indexed mesh is missing an index format")
    pass.setIndexBuffer(mesh.indexBuffer, mesh.indexFormat, 0, mesh.indexBuffer.size)
    pass.drawIndexed(mesh.count)
  } else {
    pass.draw(mesh.count)
  }
}

/**
 * Draws a non-mesh render item using its vertex-count parameters.
 *
 * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
 * @param {import("../renderer.js").WebGLRenderer} renderer
 * @param {View} view
 * @param {NonMeshRenderItem} item
 */
export function drawNonMeshRenderItem(pass, renderer, view, item) {
  const { caches } = renderer
  const pipeline = caches.getRenderPipeline(item.pipelineId)

  if (!pipeline) {
    return
  }

  pass.setPipeline(pipeline)
  item.bindings.apply(pass, renderer, view)

  pass.draw(item.vertexCount, item.instanceCount, item.firstVertex, item.firstInstance)
}
export class MeshRenderItem extends RenderItem {
  /**
   * @type {GPUMesh}
   */
  mesh

  /**
   * @type {import("../../material/index.js").RawMaterial}
   */
  material

  /**
   * @type {import("../../core/index.js").WebGLBindGroup | undefined}
   */
  morphBindGroup

  /**
   * @type {Affine3}
   */
  transform

  /**
   * @param {MeshRenderItemOptions} options
   */
  constructor({
    pipelineId,
    mesh,
    tag,
    material,
    morphBindGroup,
    transform,
    bindings
  }) {
    super({ pipelineId, tag, bindings })
    this.transform = transform
    this.mesh = mesh
    this.material = material
    this.morphBindGroup = morphBindGroup

    if (morphBindGroup) {
      this.bindings.set(3, morphBindGroup)
    }
  }
}

/**
 * Non-mesh render item options.
 *
 * @typedef NonMeshRenderItemOptions
 * @property {number} pipelineId
 * @property {string} tag
 * @property {import("../../core/index.js").WebGLBindGroup} [bindGroup]
 * @property {RenderBindingSet} [bindings]
 * @property {number} [vertexCount]
 * @property {number} [instanceCount]
 * @property {number} [firstVertex]
 * @property {number} [firstInstance]
 */

/**
 * Render item for fullscreen or other vertex-stream-only draws.
 */
export class NonMeshRenderItem extends RenderItem {
  /**
   * @type {import("../../core/index.js").WebGLBindGroup | undefined}
   */
  bindGroup

  /**
   * @type {number}
   */
  vertexCount

  /**
   * @type {number}
   */
  instanceCount

  /**
   * @type {number}
   */
  firstVertex

  /**
   * @type {number}
   */
  firstInstance

  /**
   * @param {NonMeshRenderItemOptions} options
   */
  constructor({
    pipelineId,
    tag,
    bindGroup,
    bindings,
    vertexCount = 3,
    instanceCount = 1,
    firstVertex = 0,
    firstInstance = 0
  }) {
    super({ pipelineId, tag, bindings })
    this.bindGroup = bindGroup
    this.vertexCount = vertexCount
    this.instanceCount = instanceCount
    this.firstVertex = firstVertex
    this.firstInstance = firstInstance

    if (bindGroup) {
      this.bindings.set(1, bindGroup)
    }
  }
}

/**
 * @typedef ViewOptions
 * @property {RenderTarget} [renderTarget]
 * @property {Texture} [depthTexture]
 * @property {ViewRectangle} [viewport]
 * @property {ViewRectangle} [scissor]
 * @property {Range} [depthRange]
 * @property {number} [colorLayer]
 * @property {number} [depthLayer]
 * @property {number} [colorMipmapLevel]
 * @property {number} [depthMipmapLevel]
 * @property {Vector3} position
 * @property {Matrix4} projection
 * @property {Matrix4} view
 * @property {number} near
 * @property {number} far
 * @property {string} tag
 * @property {Object3D} [object]
 * @property {RenderMask} [renderMask]
 */

/**
 * @typedef MeshRenderItemOptions
 * @property {Affine3} transform
 * @property {GPUMesh} mesh
 * @property {number} pipelineId
 * @property {import("../../material/index.js").RawMaterial} material
 * @property {import("../../core/index.js").WebGLBindGroup} [morphBindGroup]
 * @property {RenderBindingSet} [bindings]
 * @property {string} tag
 */
