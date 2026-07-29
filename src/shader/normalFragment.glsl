#include <common>

struct NormalMaterial {
  vec4 padding;
};

in vec3 v_normal;

out vec4 fragment_color;

uniform MaterialBlock {
  NormalMaterial material;
};

void main(){
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    #error "Mesh vertex normals are required for lighting."
  #endif
  fragment_color = vec4(normal, 1.0);
}
