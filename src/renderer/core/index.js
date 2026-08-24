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
   * @type {RenderItem[]}
   */
  meshItems = []

  /**
   * @type {RenderItem[]}
   */
  nonMeshItems = []

  /**
   * @param {RenderItem} item
   */
  add(item) {
    if (item.meshInstance) {
      this.meshItems.push(item)
      this.items.splice(this.meshItems.length - 1, 0, item)
      return
    }

    this.nonMeshItems.push(item)
    this.items.push(item)
  }
  clear() {
    this.items.length = 0
    this.meshItems.length = 0
    this.nonMeshItems.length = 0
  }

  /**
   * Returns mesh items in the order they should be prepared and drawn.
   *
   * @param {View} _view
   * @returns {RenderItem[]}
   */
  getMeshItems(_view) {
    return this.meshItems
  }

  /**
   * Returns non-mesh items in the order they should be drawn.
   *
   * @param {View} _view
   * @returns {RenderItem[]}
   */
  getNonMeshItems(_view) {
    return this.nonMeshItems
  }

  /**
   * @param {import("../../core/index.js").WebGLRenderPassEncoder} pass
   * @param {WebGL2RenderingContext} context
 * @param {import("../../caches/cache.js").Caches} caches
 * @param {MeshInstancePhaseBindGroup} phaseState
 * @param {number} bindGroupIndex
 * @param {View} view
 */
  renderItems(pass, context, caches, phaseState, bindGroupIndex, view) {
    const meshItems = this.getMeshItems(view)
    const nonMeshItems = this.getNonMeshItems(view)

    for (let i = 0; i < meshItems.length; i++) {
      const meshItem = /** @type {RenderItem} */ (meshItems[i])

      drawRenderItem(pass, context, caches, meshItem, phaseState, bindGroupIndex, i)
    }

    for (let i = 0; i < nonMeshItems.length; i++) {
      const nonMeshItem = /** @type {RenderItem} */ (nonMeshItems[i])

      drawRenderItem(pass, context, caches, nonMeshItem)
    }
  }
}

export class SortedRenderStage extends RenderStage {
  /**
   * Returns mesh items back-to-front using the supplied view as the sorting reference.
   * @override
   * @param {View} view
   * @returns {RenderItem[]}
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
 * @param {MeshInstancePhaseBindGroup} [phaseState]
 * @param {number} [bindGroupIndex=0]
 * @param {number} [meshIndex=0]
 */
export function drawRenderItem(pass, _context, caches, item, phaseState, bindGroupIndex = 0, meshIndex = 0) {
  const { pipelineId, mesh } = item
  const pipeline = caches.getRenderPipeline(pipelineId)

  if (!pipeline) {
    return
  }

  pass.setPipeline(pipeline)

  if (item.meshInstance) {
    assert(phaseState, "Mesh instance phase state missing")
    assert(phaseState.bindGroup, "Mesh instance phase bind group missing")
    pass.setBindGroup(bindGroupIndex, phaseState.bindGroup, [phaseState.getOffset(meshIndex)])
  }

  if (item.bindGroup) {
    pass.setBindGroup(1, item.bindGroup)
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
 * @property {MeshInstanceUniform} [meshInstance]
 * @property {string} tag
 */
