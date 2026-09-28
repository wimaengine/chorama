#include <common>

in vec3 v_position;
in vec3 v_normal;

out vec4 fragment_color;

vec3 calculate_geometric_normal(vec3 position) {
  return normalize(cross(dFdx(position), dFdy(position)));
}

void main(){
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    vec3 normal = calculate_geometric_normal(v_position);
  #endif
  vec2 encoded_normal = octahedral_encode(normal);
  fragment_color = vec4(encoded_normal, 0.0, 1.0);
}
