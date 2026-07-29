import { GPUMesh } from "../../core/index.js"
import { Affine3, Matrix4, Vector3 } from "../../math/index.js"
import { Object3D, RenderMask } from "../../objects/index.js"
import { RenderTarget } from "../../rendertarget/index.js"

export class View {
  /**
   * @type {RenderStages}
   */
  renderStage = new RenderStages()
  /**
   * @type {number}
   */
  order = 0
  /**
   * @type {RenderTarget | undefined}
   */
  renderTarget

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
    this.near = near
    this.far = far
    this.tag = tag
    this.projectionMatrix = projection
    this.viewMatrix = view
    this.viewPosition = position
    this.object = object
    this.renderMask.copy(renderMask)
  }

  getData() {
    return {
      name: "CameraBlock",
      data: new Float32Array([
        ...this.viewMatrix,
        ...this.projectionMatrix,
        ...this.viewPosition,
        this.near,
        this.far
      ]).buffer
    }
  }
}

export class RenderStages {
  /**
   * @type {RenderItem[] | undefined}
   */
  opaque

  /**
   * @type {RenderItem[] | undefined}
   */
  alphaMask
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
    transform
  }) {
    this.pipelineId = pipelineId
    this.transform = transform
    this.mesh = mesh
    this.tag = tag
    this.bindGroup = bindGroup
  }
}

/**
 * @typedef ViewOptions
 * @property {RenderTarget} [renderTarget]
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
 * @property {string} tag
 */
