import { WebGLDeviceLimits, WebGLRenderDevice } from "../core/index.js"
import { Object3D } from "../objects/index.js"
import { colorShaderLib, commonShaderLib, lightShaderLib, mathShaderLib, tonemapShaderLib } from "../shader/index.js"
import { Sampler, Texture } from "../texture/index.js"
import { TextureFilter, TextureType } from "../constants/index.js"
import { assert } from '../utils/index.js'
import { Caches } from "../caches/index.js"
import { Attribute } from "../mesh/index.js"
import { Plugin } from "./plugin.js"
import { RenderGraph, SortViewsNode } from "./graph/index.js"
import { Views } from "./views.js"
import { ViewBindGroups } from "./resources/index.js"

export class WebGLRenderer {

  /**
   * @type {Map<string, unknown>}
   */
  resources = new Map()

  /**
   * @readonly
   * @type {WebGLDeviceLimits}
   */
  limits

  /**
   * @readonly
   * @type {Caches}
   */
  caches = new Caches()

  /**
   * @readonly
   */
  defaults = new Defaults()

  /**
   * @readonly
   * @type {ReadonlyMap<string,Attribute>}
   */
  attributes

  /**
   * @readonly
   * @type {Map<string, string>}
   */
  includes = new Map()

  /**
   * @readonly
   * @type {Map<string, string>}
   */
  defines = new Map()

  /**
   * @readonly
   * @type {readonly Plugin[]} 
   */
  plugins

  /**
   * @readonly
   * @type {RenderGraph}
   */
  renderGraph

  /**
   * @param {WebGLRendererOptions} options 
   */
  constructor({ plugins = [] } = {}) {
    const dummy = new OffscreenCanvas(100, 100)
    const context = dummy.getContext('webgl2')

    assert(context, "Webgl context creation failed")
    this.plugins = plugins
    this.limits = new WebGLDeviceLimits(context)
    this.attributes = new Map()
      .set(Attribute.Position.name, Attribute.Position)
      .set(Attribute.UV.name, Attribute.UV)
      .set(Attribute.UVB.name, Attribute.UVB)
      .set(Attribute.Normal.name, Attribute.Normal)
      .set(Attribute.Tangent.name, Attribute.Tangent)
      .set(Attribute.Color.name, Attribute.Color)
      .set(Attribute.JointIndex.name, Attribute.JointIndex)
      .set(Attribute.JointWeight.name, Attribute.JointWeight)
    this.setResource(new Views())
    this.setResource(new ViewBindGroups())

    this.renderGraph = new RenderGraph()
    this.renderGraph.addNode(SortViewsNode.name, new SortViewsNode())

    for (let i = 0; i < plugins.length; i++) {
      const plugin = /**@type {Plugin} */ (plugins[i]);

      plugin.init(this)
    }

    this.includes
      .set("common", commonShaderLib)
      .set("color", colorShaderLib)
      .set("light", lightShaderLib)
      .set("math", mathShaderLib)
      .set("tonemap", tonemapShaderLib)
  }

  /**
   * @template {object} T
   * @param {T} item
   */
  setResource(item) {
    this.resources.set(item.constructor.name, item)
  }

  /**
   * @template T
   * @param {import("../loader/loader.js").Constructor<T>} item
   * @returns {T | undefined}
   */
  getResource(item) {
    return /**@type {T} */ (this.resources.get(item.name))
  }

  /**
   * @param {{name: any;data: any;}} dataForm
   * @param {WebGL2RenderingContext} context
   */
  updateUBO(context, dataForm) {
    const { data, name } = dataForm
    const ubo = this.caches.uniformBuffers.get(name)

    if (!ubo) return

    ubo.update(context, data)
  }

  /**
   * @param {Object3D[]} objects
   * @param {WebGLRenderDevice} renderDevice
   */
  render(objects, renderDevice) {
    const views = this.getResource(Views)

    assert(views, "Views resource missing")
    views.clear()

    for (let i = 0; i < objects.length; i++) {
      const object = /**@type {Object3D} */ (objects[i])

      object.traverseDFS((object) => {
        object.update()
        return true
      })
    }

    this.renderGraph.execute({
      renderer: this,
      objects,
      renderDevice
    })
  }
}

/**
 * @typedef WebGLRendererOptions
 * @property {Plugin[]} [plugins]
 */

export class Defaults {
  texture2D = Texture.default()
  textureCube = createDefaultCubeTexture()
  textureSampler = Sampler.default()
  textureNearestSampler = new Sampler({
    minificationFilter: TextureFilter.Nearest,
    magnificationFilter: TextureFilter.Nearest
  })
}

function createDefaultCubeTexture() {
  const width = 1
  const height = 1
  const depth = 6
  const pixel = new Uint8Array([0, 0, 0, 255])
  const data = new Uint8Array(width * height * depth * pixel.length)

  for (let face = 0; face < depth; face++) {
    data.set(pixel, face * pixel.length)
  }

  return new Texture({
    width,
    height,
    depth,
    data: [data.buffer],
    type: TextureType.TextureCubeMap,
  })
}
