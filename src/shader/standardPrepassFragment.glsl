#include <common>

struct StandardMaterial {
  vec4 color;
  float metallic;
  float roughness;
  float ambient_occlusion_strength;
  vec3 emissive_color;
  float emissive_intensity;
  float reflection_strength;
  float transmission;
  float thickness;
  float ior;
  float alpha_cutoff;
};

in vec3 v_position;
#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif
#ifdef VERTEX_COLORS
  in vec4 v_color;
#endif
#ifdef VERTEX_NORMALS
  in vec3 v_normal;
#endif

uniform MaterialBlock {
  StandardMaterial material;
};
uniform sampler2D mainTexture;

#ifdef NORMAL_PASS
out vec4 normal_output;
#endif

vec3 calculate_geometric_normal(vec3 position) {
  return normalize(cross(dFdx(position), dFdy(position)));
}

void main() {
  #ifdef ALPHA_MASK_MODE
    float opacity = material.color.a;
    #ifdef VERTEX_COLORS
      opacity *= v_color.a;
    #endif
    #ifdef VERTEX_UVS
      opacity *= texture(mainTexture, v_uv).a;
    #endif
    if (opacity < material.alpha_cutoff) {
      discard;
    }
  #endif
  #ifndef SHADOWPASS
    prepass();
  #endif
}

void prepass(){
  #ifdef NORMAL_PASS
    #ifdef VERTEX_NORMALS
      vec3 normal = normalize(v_normal);
    #else
      vec3 normal = calculate_geometric_normal(v_position);
    #endif
    normal_output = vec4(octahedral_encode(normal), 0.0, 1.0);
  #endif
}
