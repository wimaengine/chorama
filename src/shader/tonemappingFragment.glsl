#include <color>
#include <tonemap>

in vec2 v_uv;

out vec4 fragment_color;

uniform sampler2D mainTexture;
layout(std140) uniform TonemappingBlock {
  float exposure;
  float saturation;
  float contrast_amount;
  float brightness;
};

void main() {
  vec4 source_color = texture(mainTexture, v_uv);
  vec3 mapped_color = source_color.rgb * exposure;

  #if defined(REINHARD_TONEMAP)
    mapped_color = reinhard_tonemapping(mapped_color);
  #elif defined(HABLE_TONEMAP)
    mapped_color = hable_tonemapping(mapped_color);
  #elif defined(ACES_FILMIC_TONEMAP)
    mapped_color = aces_filmic_tonemapping(mapped_color);
  #elif defined(AGX_TONEMAP)
    mapped_color = agx_tonemapping(mapped_color);
  #elif defined(KHRONOS_PBR_NEUTRAL_TONEMAP)
    mapped_color = khronos_pbr_neutral_tonemapping(mapped_color);
  #endif

  mapped_color = color_grade(mapped_color, saturation, contrast_amount, brightness);
  mapped_color = quick_linear_to_sRGB(mapped_color);
  fragment_color = vec4(mapped_color, source_color.a);
}
