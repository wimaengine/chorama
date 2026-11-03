#include <common>
#include <mesh>

uniform CameraBlock {
  Camera camera;
};

uniform MeshInstanceBlock {
  MeshInstance mesh_instance;
};
uniform sampler2DArray bone_transforms;
#ifdef MORPH_TARGETS
uniform sampler2DArray morph_targets;
#endif

in vec3 position3d;
in vec2 uv;
in vec3 normal;
#ifdef VERTEX_COLORS
  in vec4 color;
#endif
#ifdef VERTEX_TANGENTS
  in vec4 tangent;
#endif
#ifdef SKINNED
  in uvec4 joint_index;
  in vec4 joint_weight;
#endif

out vec3 v_position;
#ifdef VERTEX_COLORS
  out vec4 v_color;
#endif
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
  vec3 morphed_position = position3d;
  vec3 morphed_normal = normal;
  #ifdef VERTEX_TANGENTS
    vec3 morphed_tangent = tangent.xyz;
  #endif

  #ifdef MORPH_TARGETS
    uint morph_target_count = min(mesh_instance.morph_target_count, 16u);
    uint morph_vertex_index = uint(gl_VertexID);
    uint morph_width = uint(textureSize(morph_targets, 0).x);
    ivec2 morph_coord_2d = map_to_index_2d(morph_vertex_index, morph_width);

    for (uint morph_target_index = 0u; morph_target_index < morph_target_count; morph_target_index++) {
      float morph_weight = get_morph_weight(mesh_instance, morph_target_index);

      if (morph_weight == 0.0) {
        continue;
      }

      uint morph_layer = morph_target_index * 3u;
      ivec3 morph_position_coord = ivec3(morph_coord_2d, int(morph_layer));
      morphed_position += texelFetch(morph_targets, morph_position_coord, 0).xyz * morph_weight;
      #ifdef VERTEX_NORMALS
        ivec3 morph_normal_coord = ivec3(morph_coord_2d, int(morph_layer + 1u));
        morphed_normal += texelFetch(morph_targets, morph_normal_coord, 0).xyz * morph_weight;
      #endif
      #ifdef VERTEX_TANGENTS
        ivec3 morph_tangent_coord = ivec3(morph_coord_2d, int(morph_layer + 2u));
        morphed_tangent += texelFetch(morph_targets, morph_tangent_coord, 0).xyz * morph_weight;
      #endif
    }

    #ifdef VERTEX_NORMALS
      morphed_normal = normalize(morphed_normal);
    #endif
    #ifdef VERTEX_TANGENTS
      morphed_tangent = normalize(morphed_tangent);
    #endif
  #endif

  #ifdef SKINNED
    mat4 boneMat0 = get_skin_bone(mesh_instance, joint_index.x, bone_transforms);
    mat4 boneMat1 = get_skin_bone(mesh_instance, joint_index.y, bone_transforms);
    mat4 boneMat2 = get_skin_bone(mesh_instance, joint_index.z, bone_transforms);
    mat4 boneMat3 = get_skin_bone(mesh_instance, joint_index.w, bone_transforms);

    vec4 skeleton_space_position = vec4(morphed_position, 1.0);
    vec4 skinned_position =
      (boneMat0 * skeleton_space_position) * joint_weight.x +
      (boneMat1 * skeleton_space_position) * joint_weight.y +
      (boneMat2 * skeleton_space_position) * joint_weight.z +
      (boneMat3 * skeleton_space_position) * joint_weight.w;
    mat3 normal_matrix = mat3(mesh_instance.transform);
    vec3 world_space_position = (mesh_instance.transform * skinned_position).xyz;
  #else
    vec3 world_space_position = (mesh_instance.transform * vec4(morphed_position, 1.0)).xyz;
    mat3 normal_matrix = mat3(mesh_instance.transform);
  #endif
  
  v_position = world_space_position;
  #ifdef VERTEX_COLORS
    v_color = color;
  #endif
  #ifdef VERTEX_UVS
    v_uv = uv;
  #endif
  #ifdef VERTEX_NORMALS
    #ifdef SKINNED
      vec3 skeleton_space_normal =
        (mat3(boneMat0) * morphed_normal) * joint_weight.x +
        (mat3(boneMat1) * morphed_normal) * joint_weight.y +
        (mat3(boneMat2) * morphed_normal) * joint_weight.z +
        (mat3(boneMat3) * morphed_normal) * joint_weight.w;
      v_normal = normal_matrix * skeleton_space_normal;
    #else
      v_normal = normal_matrix * morphed_normal;
    #endif
  #endif
  #ifdef VERTEX_TANGENTS
    #ifdef SKINNED
      vec3 skeleton_space_tangent =
        (mat3(boneMat0) * morphed_tangent) * joint_weight.x +
        (mat3(boneMat1) * morphed_tangent) * joint_weight.y +
        (mat3(boneMat2) * morphed_tangent) * joint_weight.z +
        (mat3(boneMat3) * morphed_tangent) * joint_weight.w;
      v_tangent = vec4(normal_matrix * skeleton_space_tangent, tangent.w);
    #else
      v_tangent = vec4(normal_matrix * morphed_tangent, tangent.w);
    #endif
  #endif
  cam_direction = camera.cam_position - world_space_position;
  gl_Position = camera.projection * camera.view * vec4(world_space_position, 1.0);
}
