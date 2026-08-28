import { View } from "../core/index.js"
import { ViewBindGroup } from "./viewbindgroup.js"

export const ViewBindings = {
  camera: ViewBindGroup.uniform(0, "CameraBlock", View.BlockSize, true),
  environmentMap: {
    texture: ViewBindGroup.texture(1, "environment_map", "cube"),
    sampler: ViewBindGroup.sampler(2, "environment_map")
  },
  boneTransforms: {
    texture: ViewBindGroup.texture(5, "bone_transforms", "2d-array"),
    sampler: ViewBindGroup.sampler(6, "bone_transforms")
  },
  depthPrePass: {
    texture: ViewBindGroup.texture(12, "pre_pass_depth", "2d"),
    sampler: ViewBindGroup.sampler(13, "pre_pass_depth")
  },
  normalPrePass: {
    texture: ViewBindGroup.texture(14, "pre_pass_normal", "2d"),
    sampler: ViewBindGroup.sampler(15, "pre_pass_normal")
  }
}
