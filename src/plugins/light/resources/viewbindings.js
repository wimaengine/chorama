import { ViewBindGroup } from "../../../renderer/resources/viewbindgroup.js"
import {
  AmbientLightUniformBuffer,
  DirectionalLightUniformBuffer,
  PointLightUniformBuffer,
  SpotLightUniformBuffer
} from "./lightuniformbuffers.js"

export const LightViewBindings = {
  ambientLight: ViewBindGroup.uniform(7, "AmbientLightBlock", AmbientLightUniformBuffer.BlockSize),
  directionalLights: ViewBindGroup.uniform(8, "DirectionalLightBlock", DirectionalLightUniformBuffer.BlockSize),
  pointLights: ViewBindGroup.uniform(9, "PointLightBlock", PointLightUniformBuffer.BlockSize),
  spotLights: ViewBindGroup.uniform(10, "SpotLightBlock", SpotLightUniformBuffer.BlockSize)
}
