#include <common>

uniform CameraBlock {
  Camera camera;
};

uniform MeshInstanceBlock {
  mat4 model;
  uint skin_index;
  uint bone_count;
};
uniform sampler2DArray bone_transforms;

mat4 get_skin_bone(uint joint_index) {
  if (bone_count == 0u) {
    return mat4(1.0);
  }

  uint resolved_joint = min(joint_index, bone_count - 1u);
  return get_value_from_texture(skin_index + resolved_joint, bone_transforms);
}

in vec3 position;
in vec2 uv;
in vec3 normal;
#ifdef VERTEX_TANGENTS
  in vec4 tangent;
#endif
#ifdef SKINNED
  in uvec4 joint_index;
  in vec4 joint_weight;
#endif

out vec3 v_position;
#ifdef VERTEX_UVS
  out vec2 v_uv;
#endif
#ifdef VERTEX_NORMALS
  out vec3 v_normal;
#endif
#ifdef VERTEX_TANGENTS
  out vec4 v_tangent;
#endif
out vec3 cam_direction;

void main(){
  #ifdef SKINNED
    mat4 boneMat0 = get_skin_bone(joint_index.x);
    mat4 boneMat1 = get_skin_bone(joint_index.y);
    mat4 boneMat2 = get_skin_bone(joint_index.z);
    mat4 boneMat3 = get_skin_bone(joint_index.w);

    vec4 skeleton_space_position = vec4(position, 1.0);
    vec4 skinned_position =
      (boneMat0 * skeleton_space_position) * joint_weight.x +
      (boneMat1 * skeleton_space_position) * joint_weight.y +
      (boneMat2 * skeleton_space_position) * joint_weight.z +
      (boneMat3 * skeleton_space_position) * joint_weight.w;
    mat3 normal_matrix = mat3(model);
    vec3 world_space_position = (model * skinned_position).xyz;
  #else
    vec3 world_space_position = (model * vec4(position,1.0)).xyz;
    mat3 normal_matrix = mat3(model);
  #endif
  
  v_position = world_space_position;
  #ifdef VERTEX_UVS
    v_uv = uv;
  #endif
  #ifdef VERTEX_NORMALS
    #ifdef SKINNED
      vec3 skeleton_space_normal =
        (mat3(boneMat0) * normal) * joint_weight.x +
        (mat3(boneMat1) * normal) * joint_weight.y +
        (mat3(boneMat2) * normal) * joint_weight.z +
        (mat3(boneMat3) * normal) * joint_weight.w;
      v_normal = normal_matrix * skeleton_space_normal;
    #else
      v_normal = normal_matrix * normal;
    #endif
  #endif
  #ifdef VERTEX_TANGENTS
    #ifdef SKINNED
      vec3 skeleton_space_tangent =
        (mat3(boneMat0) * tangent.xyz) * joint_weight.x +
        (mat3(boneMat1) * tangent.xyz) * joint_weight.y +
        (mat3(boneMat2) * tangent.xyz) * joint_weight.z +
        (mat3(boneMat3) * tangent.xyz) * joint_weight.w;
      v_tangent = vec4(normal_matrix * skeleton_space_tangent, tangent.w);
    #else
      v_tangent = vec4(normal_matrix * tangent.xyz, tangent.w);
    #endif
  #endif
  cam_direction = camera.cam_position - world_space_position;
  gl_Position = camera.projection * camera.view * vec4(world_space_position, 1.0);
}
