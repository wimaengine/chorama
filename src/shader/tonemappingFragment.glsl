#include <color>
#include <tonemap>

in vec2 v_uv;

out vec4 fragment_color;

uniform sampler2D mainTexture;
layout(std140) uniform TonemappingBlock {
  float exposure;
};

void main() {
  vec4 source_color = texture(mainTexture, v_uv);

  #if defined(REINHARD_TONEMAP)
    vec3 mapped_color = source_color.rgb;
    mapped_color = reinhard_tonemapping(mapped_color, exposure);
    fragment_color = vec4(quick_linear_to_sRGB(mapped_color), source_color.a);
  #elif defined(HABLE_TONEMAP)
    vec3 mapped_color = source_color.rgb;
    mapped_color = hable_tonemapping(mapped_color, exposure);
    fragment_color = vec4(quick_linear_to_sRGB(mapped_color), source_color.a);
  #elif defined(ACES_FILMIC_TONEMAP)
    vec3 mapped_color = source_color.rgb;
    mapped_color = aces_filmic_tonemapping(mapped_color, exposure);
    fragment_color = vec4(quick_linear_to_sRGB(mapped_color), source_color.a);
  #elif defined(AGX_TONEMAP)
    vec3 mapped_color = source_color.rgb;
    mapped_color = agx_tonemapping(mapped_color, exposure);
    fragment_color = vec4(quick_linear_to_sRGB(mapped_color), source_color.a);
  #elif defined(KHRONOS_PBR_NEUTRAL_TONEMAP)
    vec3 mapped_color = source_color.rgb;
    mapped_color = khronos_pbr_neutral_tonemapping(mapped_color, exposure);
    fragment_color = vec4(quick_linear_to_sRGB(mapped_color), source_color.a);
  #else
    fragment_color = source_color;
  #endif
}
