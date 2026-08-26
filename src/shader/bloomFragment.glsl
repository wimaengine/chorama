in vec2 v_uv;

out vec4 fragment_color;

layout(std140) uniform BloomBlock {
  float threshold;
  float intensity;
  float softKnee;
};

#if defined(EXTRACT_BRIGHT)
uniform sampler2D mainTexture;
#endif

#if defined(ACCUMULATE_BLOOM)
uniform sampler2D accumTexture;
#endif

uniform sampler2D bloomTexture;

#if defined(COMPOSITE_BLOOM)
uniform sampler2D sceneTexture;
#endif

#if defined(EXTRACT_BRIGHT)
float brightness(vec3 color) {
  return max(max(color.r, color.g), color.b);
}

vec3 extract_bright(vec3 color) {
  float peak = brightness(color);
  float knee = max(threshold * softKnee, 1e-5);
  float soft = peak - threshold + knee;
  soft = clamp(soft, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee + 1e-5);
  float hard = max(peak - threshold, 0.0);
  float amount = max(soft, hard);
  return color * (amount / max(peak, 1e-5));
}
#endif

void main() {
  #if defined(EXTRACT_BRIGHT)
    vec4 source_color = texture(mainTexture, v_uv);
    fragment_color = vec4(extract_bright(source_color.rgb), source_color.a);
  #elif defined(ACCUMULATE_BLOOM)
    vec4 accum_color = texture(accumTexture, v_uv);
    vec3 bloom_color = texture(bloomTexture, v_uv).rgb;
    fragment_color = vec4(accum_color.rgb + bloom_color, 1.0);
  #elif defined(COMPOSITE_BLOOM)
    vec4 scene_color = texture(sceneTexture, v_uv);
    vec3 bloom_color = texture(bloomTexture, v_uv).rgb;
    fragment_color = vec4(scene_color.rgb + bloom_color * intensity, scene_color.a);
  #else
    fragment_color = vec4(0.0, 0.0, 0.0, 1.0);
  #endif
}
