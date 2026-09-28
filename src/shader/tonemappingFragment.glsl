#include <color>
#include <tonemap>

in vec2 v_uv;

out vec4 fragment_color;

uniform sampler2D mainTexture;
uniform sampler3D gradingLUT;
layout(std140) uniform TonemappingBlock {
  float exposure;
  float saturation;
  float contrast_amount;
  float brightness;
};

vec3 sample_color_lut(vec3 color) {
  color = clamp(color, vec3(0.0), vec3(1.0));

  vec3 lut_size = vec3(textureSize(gradingLUT, 0));
  vec3 scale = (lut_size - vec3(1.0)) / lut_size;
  vec3 offset = vec3(0.5) / lut_size;

  return texture(gradingLUT, color * scale + offset).rgb;
}

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
  mapped_color = sample_color_lut(mapped_color);
  mapped_color = quick_linear_to_sRGB(mapped_color);
  fragment_color = vec4(mapped_color, source_color.a);
}
