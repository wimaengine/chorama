#include <common>

struct BasicMaterial {
  vec4 color;
};

#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif

out vec4 fragment_color;

uniform MaterialBlock {
  BasicMaterial material;
};
uniform sampler2D mainTexture;

void main(){
  vec3 base_color = material.color.rgb.rgb;
  float opacity = material.color.a;
  
  #ifdef VERTEX_UVS
    vec4 sample_color = texture(mainTexture, v_uv);
    base_color *= sample_color.rgb;
  #endif
  fragment_color = vec4(base_color, opacity);
}
