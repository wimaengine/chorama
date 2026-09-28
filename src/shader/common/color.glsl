const vec3 REC709_LUMINANCE_WEIGHTS = vec3(0.2126, 0.7152, 0.0722);

vec3 quick_sRGB_to_linear(vec3 color) {
  return pow(color, vec3(2.2));
}

vec3 quick_linear_to_sRGB(vec3 color) {
  return pow(color, 1.0 / vec3(2.2));
}

float luminance(vec3 color) {
  return dot(color, REC709_LUMINANCE_WEIGHTS);
}

vec3 saturate(vec3 color, float amount) {
  return mix(vec3(luminance(color)), color, amount);
}

vec3 contrast(vec3 color, float amount) {
  return (color - vec3(0.5)) * amount + vec3(0.5);
}

vec3 color_grade(
  vec3 color,
  float saturation,
  float contrast_amount,
  float brightness
) {
  color += vec3(brightness);
  color = contrast(color, contrast_amount);
  color = saturate(color, saturation);
  return max(color, vec3(0.0));
}
