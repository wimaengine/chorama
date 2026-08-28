struct MeshInstance {
  mat4 transform;
  uint skin_index;
  uint bone_count;
};

mat4 get_skin_bone(MeshInstance mesh_instance, uint joint_index, sampler2DArray bone_transforms) {
  if (mesh_instance.bone_count == 0u) {
    return mat4(1.0);
  }

  uint resolved_joint = min(joint_index, mesh_instance.bone_count - 1u);
  return get_value_from_texture(mesh_instance.skin_index + resolved_joint, bone_transforms);
}
