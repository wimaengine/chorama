in vec2 v_uv;

out vec4 fragment_color;

uniform sampler2D mainTexture;

const int BLUR_RADIUS = (BLUR_TAPS - 1) / 2;

float gaussian_weight(float sampleOffset) {
  float radius = max(float(BLUR_RADIUS), 1.0);
  float sigma = max(radius * 0.5, 1.0);
  float variance = 2.0 * sigma * sigma;
  return exp(-(sampleOffset * sampleOffset) / variance);
}

vec3 gaussian_blur(vec2 direction) {
  vec2 texel = direction / vec2(textureSize(mainTexture, 0));
  vec3 color = vec3(0.0);
  float weightSum = 0.0;

  float centerWeight = gaussian_weight(0.0);
  color += texture(mainTexture, v_uv).rgb * centerWeight;
  weightSum += centerWeight;

  for (int i = 1; i <= BLUR_RADIUS; ++i) {
    float weight = gaussian_weight(float(i));
    vec2 offset = texel * float(i);
    color += texture(mainTexture, v_uv + offset).rgb * weight;
    color += texture(mainTexture, v_uv - offset).rgb * weight;
    weightSum += weight * 2.0;
  }

  return color / max(weightSum, 1e-5);
}

void main() {
  #if defined(HORIZONTAL_BLUR)
    fragment_color = vec4(gaussian_blur(vec2(1.0, 0.0)), 1.0);
  #elif defined(VERTICAL_BLUR)
    fragment_color = vec4(gaussian_blur(vec2(0.0, 1.0)), 1.0);
  #else
    fragment_color = vec4(0.0, 0.0, 0.0, 1.0);
  #endif
}
