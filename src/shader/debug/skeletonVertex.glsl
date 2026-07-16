precision mediump float;
precision mediump sampler2DArray;

#include <common>

uniform CameraBlock {
Camera camera;
};
uniform sampler2DArray transforms;
uniform mat4 model;
uniform uint parent_index;
uniform uint child_index;

out vec3 color;

void main() {
  mat4 parent_matrix = get_value_from_texture(parent_index, transforms);
  mat4 child_matrix  = get_value_from_texture(child_index, transforms);

  vec3 parent_position = parent_matrix[3].xyz;
  vec3 child_position  = child_matrix[3].xyz;

  // Each bone line is made of two vertices.
  vec3 world_position = (gl_VertexID % 2 == 0) ? parent_position : child_position;

  color = (gl_VertexID % 2 == 0) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  gl_Position = camera.projection * camera.view * model * vec4(world_position, 1.0);
}
