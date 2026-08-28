#include <common>

in vec3 v_normal;

out vec4 fragment_color;

void main(){
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    #error "Mesh vertex normals are required for lighting."
  #endif
  vec2 encoded_normal = octahedral_encode(normal);
  fragment_color = vec4(encoded_normal, 0.0, 1.0);
}
