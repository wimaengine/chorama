/** @import { Texture } from "../../texture/index.js" */
/** @import { MeshInstanceUniform } from "../resources/meshinstanceuniform.js" */
/** @import { MeshInstancePhaseBindGroup } from "../resources/meshinstancebindgroups.js" */
import { GPUMesh } from "../../core/index.js"
import { Affine3, Matrix4, Vector3 } from "../../math/index.js"
import { Object3D, RenderMask } from "../../objects/index.js"
import { RenderTarget } from "../../rendertarget/index.js"
import { assert } from "../../utils/index.js"
import { Range, ViewRectangle } from "../../utils/index.js"

export class View {
  /**
   * @type {RenderStage}
   */
  opaque = new RenderStage()
  /**
   * @type {RenderStage}
   */
  alphaMask = new RenderStage()
  /**
   * @type {SortedRenderStage}
   */
  transparent = new SortedRenderStage()
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
  }

  getData() {
    return new Float32Array([
      ...this.viewMatrix,
      ...this.projectionMatrix,
      ...this.viewPosition,
      this.near,
      this.far
    ]).buffer
  }
  /**
   * Raw packed payload size before std140 padding is applied.
   * @readonly
   * @type {number}
   */
  static BlockSize = 37 * Float32Array.BYTES_PER_ELEMENT

}

export class RenderStage {
  /**
   * @type {RenderItem[]}
   */
  items = []

  /**
   * @param {RenderItem} item
   */
  add(item) {
    this.items.push(item)
  }
  clear() {
    this.items.length = 0
  }
  /**
   * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
   * @param {WebGL2RenderingContext} context
   * @param {import("../../caches/cache.js").Caches} caches
   * @param {MeshInstancePhaseBindGroup} phaseState
   * @param {number} bindGroupIndex
   * @param {View} _view
   */
  renderItems(pass, context, caches, phaseState, bindGroupIndex, _view) {
    for (let i = 0; i < this.items.length; i++) {
      drawRenderItem(pass, context, caches, /**@type {RenderItem}*/(this.items[i]), phaseState, bindGroupIndex)
    }
  }
}

export class SortedRenderStage extends RenderStage {
  /**
   * Renders items back-to-front using the supplied view as the sorting reference.
   * @override
   * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
   * @param {WebGL2RenderingContext} context
   * @param {import("../../caches/cache.js").Caches} caches
   * @param {MeshInstancePhaseBindGroup} phaseState
   * @param {number} bindGroupIndex
   * @param {View} view
   */
  renderItems(pass, context, caches, phaseState, bindGroupIndex, view) {
    const sortedItems = this.items
      .map((item, index) => ({
        item,
        index,
        depth: getViewSpaceDepth(view, item)
      }))
      .sort((a, b) => a.depth - b.depth || a.index - b.index)

    for (const { item } of sortedItems) {
      drawRenderItem(pass, context, caches, item, phaseState, bindGroupIndex)
    }
  }
}

/**
 * @param {View} view
 * @param {RenderItem} item
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
 * Draws a render item using its explicit bind-group list.
 *
 * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
 * @param {WebGL2RenderingContext} _context
 * @param {import("../../caches/cache.js").Caches} caches
 * @param {RenderItem} item
 * @param {MeshInstancePhaseBindGroup} phaseState
 * @param {number} [bindGroupIndex=0]
 */
export function drawRenderItem(pass, _context, caches, item, phaseState, bindGroupIndex = 0) {
  const { pipelineId, mesh } = item
  const pipeline = caches.getRenderPipeline(pipelineId)

  if (!pipeline) {
    return
  }

  pass.setPipeline(pipeline)

  if (item.meshInstance) {
    assert(phaseState.bindGroup, "Mesh instance phase bind group missing")
    const slot = phaseState.setData(item.meshInstance, item.meshInstance.getData())
    pass.setBindGroup(bindGroupIndex, phaseState.bindGroup, [slot.offset])
  }

  const bindGroups = item.bindGroups.length > 0
    ? item.bindGroups
    : item.bindGroup
      ? [{
          index: 1,
          bindGroup: item.bindGroup,
          dynamicOffsets: []
        }]
      : []

  for (let i = 0; i < bindGroups.length; i++) {
    const bindGroupState = bindGroups[i]

    if (!bindGroupState) {
      continue
    }

    const { index, bindGroup, dynamicOffsets = [] } = bindGroupState

    pass.setBindGroup(index, bindGroup, dynamicOffsets)
  }

  pass.draw(mesh)
}
export class RenderItem {

  /**
   * @type {number}
   */
  pipelineId

  /**
   * @type {GPUMesh}
   */
  mesh

  /**
   * @type {ReadonlyArray<RenderItemBindGroup>}
   */
  bindGroups

  /**
   * @type {MeshInstanceUniform | undefined}
   */
  meshInstance

  /**
   * @type {import("../../core/index.js").WebGLBindGroup | undefined}
   */
  bindGroup

  /**
   * @type {string}
   */
  tag

  /**
   * @type {Affine3}
   */
  transform

  /**
   * @param {RenderItemOptions} options 
   */
  constructor({
    pipelineId,
    mesh,
    tag,
    bindGroups = [],
    bindGroup,
    meshInstance,
    transform
  }) {
    this.pipelineId = pipelineId
    this.transform = transform
    this.mesh = mesh
    this.tag = tag
    this.bindGroup = bindGroup
    this.meshInstance = meshInstance
    this.bindGroups = bindGroups.length > 0
      ? [...bindGroups].sort((a, b) => a.index - b.index)
      : bindGroup
        ? [{
            index: 1,
            bindGroup,
            dynamicOffsets: []
          }]
        : []
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
 * @typedef RenderItemOptions
 * @property {Affine3} transform
 * @property {GPUMesh} mesh
 * @property {number} pipelineId
 * @property {import("../../core/index.js").WebGLBindGroup} [bindGroup]
 * @property {RenderItemBindGroup[]} [bindGroups]
 * @property {MeshInstanceUniform} [meshInstance]
 * @property {string} tag
 */

/**
 * @typedef RenderItemBindGroup
 * @property {number} index
 * @property {import("../../core/index.js").WebGLBindGroup} bindGroup
 * @property {ReadonlyArray<number>} [dynamicOffsets]
 */
