#include <common>

in vec3 v_position;
#ifdef VERTEX_NORMALS
  in vec3 v_normal;
#endif

#ifdef NORMAL_PASS
out vec4 normal_output;
#endif

vec3 calculate_geometric_normal(vec3 position) {
  return normalize(cross(dFdx(position), dFdy(position)));
}

void main() {
  #ifndef SHADOWPASS
    prepass();
  #endif
}

void prepass() {
  #ifdef NORMAL_PASS
    #ifdef VERTEX_NORMALS
      vec3 normal = normalize(v_normal);
    #else
      vec3 normal = calculate_geometric_normal(v_position);
    #endif
    normal_output = vec4(octahedral_encode(normal), 0.0, 1.0);
  #endif
}
