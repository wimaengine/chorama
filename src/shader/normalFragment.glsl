#include <common>

struct NormalMaterial {
  vec4 padding;
};

in vec3 v_position;
in vec3 v_normal;

out vec4 fragment_color;

vec3 calculate_geometric_normal(vec3 position) {
  return normalize(cross(dFdx(position), dFdy(position)));
}

uniform MaterialBlock {
  NormalMaterial material;
};

void main(){
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    vec3 normal = calculate_geometric_normal(v_position);
  #endif
  fragment_color = vec4(normal, 1.0);
}
