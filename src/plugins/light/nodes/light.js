import { AmbientLight, DirectionalLight, Object3D, PointLight, SpotLight } from "../../../objects/index.js"
import {
  AmbientLightUniformBuffer,
  DirectionalLightUniformBuffer,
  MAX_DIRECTIONAL_LIGHTS,
  MAX_POINT_LIGHTS,
  MAX_SPOT_LIGHTS,
  PointLightUniformBuffer,
  SpotLightUniformBuffer
} from "../resources/index.js"
import { ShadowMap } from "../../shadow/index.js"
import { assert } from "../../../utils/index.js"

export class LightNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    updateLights(context.objects, context.renderer)
  }
}

/**
 * @param {import("../../../objects/index.js").Object3D[]} objects
 * @param {import("../../../renderer/index.js").WebGLRenderer} renderer
 */
function updateLights(objects, renderer) {
  const shadowMap = renderer.getResource(ShadowMap)
  const ambientLightUniformBuffer = renderer.getResource(AmbientLightUniformBuffer)
  const directionalLightUniformBuffer = renderer.getResource(DirectionalLightUniformBuffer)
  const pointLightUniformBuffer = renderer.getResource(PointLightUniformBuffer)
  const spotLightUniformBuffer = renderer.getResource(SpotLightUniformBuffer)
  const ambientData = new ArrayBuffer(AmbientLightUniformBuffer.BlockSize)
  const ambientView = new DataView(ambientData)
  const directionalLights = new LightQueue()
  const pointLights = new LightQueue()
  const spotLights = new LightQueue()

  assert(ambientLightUniformBuffer, "AmbientLightUniformBuffer resource missing")
  assert(directionalLightUniformBuffer, "DirectionalLightUniformBuffer resource missing")
  assert(pointLightUniformBuffer, "PointLightUniformBuffer resource missing")
  assert(spotLightUniformBuffer, "SpotLightUniformBuffer resource missing")

  for (let i = 0; i < objects.length; i++) {
    const object = /**@type {Object3D}*/(objects[i])

    object.traverseDFS((object) => {
      if (object instanceof DirectionalLight) {
        directionalLights.add(object)
      } else if (object instanceof PointLight) {
        pointLights.add(object)
      } else if (object instanceof SpotLight) {
        spotLights.add(object)
      } else if (object instanceof AmbientLight) {
        object.getData(ambientView)
      }
      return true
    })
  }

  ambientLightUniformBuffer.setData(ambientData)

  const directionalCount = directionalLights.count(MAX_DIRECTIONAL_LIGHTS)
  const spotCount = spotLights.count(MAX_SPOT_LIGHTS)
  const pointCount = pointLights.count(MAX_POINT_LIGHTS)
  const directionalLightData = new ArrayBuffer(DirectionalLightUniformBuffer.BlockSize)
  const spotLightData = new ArrayBuffer(SpotLightUniformBuffer.BlockSize)
  const pointLightData = new ArrayBuffer(PointLightUniformBuffer.BlockSize)

  directionalLights.getData(new DataView(directionalLightData), directionalCount)
  spotLights.getData(new DataView(spotLightData), spotCount)
  pointLights.getData(new DataView(pointLightData), pointCount)

  const directionalItems = new Int32Array(directionalLightData)
  const spotItems = new Int32Array(spotLightData)
  const pointItems = new Int32Array(pointLightData)

  for (let i = 0; i < directionalCount; i++) {
    const offset = (i * 12) + 8 + 4
    const item = shadowMap?.inner.get(/**@type {DirectionalLight}*/(directionalLights.lights[i]))

    if (item?.enabled) {
      directionalItems[offset] = item.spaceIndex
    } else {
      directionalItems[offset] = -1
    }
  }

  for (let i = 0; i < spotCount; i++) {
    const offset = (i * 16) + 7 + 4
    const item = shadowMap?.inner.get(/**@type {SpotLight}*/(spotLights.lights[i]))
    if (item?.enabled) {
      spotItems[offset] = item.spaceIndex
    } else {
      spotItems[offset] = -1
    }
  }

  for (let i = 0; i < pointCount; i++) {
    const offset = (i * 12) + 10 + 4
    const item = shadowMap?.inner.get(/**@type {PointLight}*/(pointLights.lights[i]))
    if (item?.enabled) {
      pointItems[offset] = item.spaceIndex
    } else {
      pointItems[offset] = -1
    }
  }

  directionalLightUniformBuffer.setData(directionalLightData)
  pointLightUniformBuffer.setData(pointLightData)
  spotLightUniformBuffer.setData(spotLightData)
}

/**
 * @template {object} T
 */
class LightQueue {
  /**
   * @type {T[]}
   */
  lights = []

  /**
   * @param {T} light
   */
  add(light) {
    this.lights.push(light)
  }

  /**
   * Packs the queued lights into the supplied data view.
   *
   * @param {DataView} data
   * @param {number} [maxLights=this.lights.length]
   */
  getData(data, maxLights = this.lights.length) {
    const lights = this.lights.slice(0, maxLights)
    data.setInt32(0, lights.length, true)

    if (lights.length === 0) {
      return
    }

    const firstLight = lights[0]

    if (!firstLight) {
      return
    }

    const stride = /** @type {{BlockSize:number}} */ (/** @type {any} */ (firstLight.constructor)).BlockSize
    const headerBytes = 4 * Int32Array.BYTES_PER_ELEMENT

    for (let i = 0; i < lights.length; i++) {
      const light = /** @type {{pack:(data:DataView)=>void}} */ (lights[i])
      light.pack(new DataView(data.buffer, data.byteOffset + headerBytes + (i * stride), stride))
    }
  }

  /**
   * @param {number} [maxLights=this.lights.length]
   * @returns {number}
   */
  count(maxLights = this.lights.length) {
    return Math.min(this.lights.length, maxLights)
  }
}
