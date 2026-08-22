import { View } from "../core/index.js"
import { ViewBindGroup } from "./viewbindgroup.js"

export const ViewBindings = {
  camera: ViewBindGroup.uniform(0, "CameraBlock", View.BlockSize, true),
  environmentMap: {
    texture: ViewBindGroup.texture(1, "environment_map", "cube"),
    sampler: ViewBindGroup.sampler(2, "environment_map")
  },
  shadowAtlas: {
    texture: ViewBindGroup.texture(3, "shadow_atlas", "2d-array"),
    sampler: ViewBindGroup.sampler(4, "shadow_atlas")
  },
  boneTransforms: {
    texture: ViewBindGroup.texture(5, "bone_transforms", "2d-array"),
    sampler: ViewBindGroup.sampler(6, "bone_transforms")
  }
}
