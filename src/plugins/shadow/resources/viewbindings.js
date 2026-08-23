import { ViewBindGroup } from "../../../renderer/resources/viewbindgroup.js"
import { ShadowCasterUniformBuffer } from "./shadowcasteruniform.js"

export const ShadowViewBindings = {
  shadowCasterBlock: ViewBindGroup.uniform(11, "ShadowCasterBlock", ShadowCasterUniformBuffer.BlockSize),
  shadowAtlas: {
    texture: ViewBindGroup.texture(3, "shadow_atlas", "2d-array"),
    sampler: ViewBindGroup.sampler(4, "shadow_atlas")
  }
}
