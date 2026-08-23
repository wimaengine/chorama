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
  const directionalLights = new LightQueue()
  const pointLights = new LightQueue()
  const spotLights = new LightQueue()

  assert(ambientLightUniformBuffer, "AmbientLightUniformBuffer resource missing")
  assert(directionalLightUniformBuffer, "DirectionalLightUniformBuffer resource missing")
  assert(pointLightUniformBuffer, "PointLightUniformBuffer resource missing")
  assert(spotLightUniformBuffer, "SpotLightUniformBuffer resource missing")

  ambientLightUniformBuffer.setData(new ArrayBuffer(AmbientLightUniformBuffer.BlockSize))

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
        ambientLightUniformBuffer.setData(object.getData().data)
      }
      return true
    })
  }

  const directionalCount = directionalLights.count(MAX_DIRECTIONAL_LIGHTS)
  const spotCount = spotLights.count(MAX_SPOT_LIGHTS)
  const pointCount = pointLights.count(MAX_POINT_LIGHTS)
  const directionalLightData = directionalLights.getData(directionalCount)
  const spotLightData = spotLights.getData(spotCount)
  const pointLightData = pointLights.getData(pointCount)
  const directionalItems = new Int32Array(directionalLightData.buffer)
  const spotItems = new Int32Array(spotLightData.buffer)
  const pointItems = new Int32Array(pointLightData.buffer)

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

  directionalLightUniformBuffer.setData(directionalLightData.buffer)
  pointLightUniformBuffer.setData(pointLightData.buffer)
  spotLightUniformBuffer.setData(spotLightData.buffer)
}

/**
 * @template {{pack:()=>number[]}} T
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
   * @param {number} [maxLights=this.lights.length]
   * @returns {Float32Array}
   */
  getData(maxLights = this.lights.length) {
    const lights = this.lights.slice(0, maxLights)
    const buffer = new Float32Array([
      0, 0, 0, 0,
      ...lights.flatMap(light => light.pack())
    ])
    const dataView = new Uint32Array(buffer.buffer)

    dataView[0] = lights.length

    return buffer
  }

  /**
   * @param {number} [maxLights=this.lights.length]
   * @returns {number}
   */
  count(maxLights = this.lights.length) {
    return Math.min(this.lights.length, maxLights)
  }
}
