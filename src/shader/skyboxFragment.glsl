#include <common>

in vec2 v_uv;

uniform CameraBlock {
  Camera camera;
};

uniform SkyBoxBlock {
  mat4 model;
  float lerp;
};
uniform samplerCube day;
uniform samplerCube night;

out vec4 fragment_color;

vec3 getSkyboxDirection() {
  vec3 viewDirection;

  // Perspective cameras need a ray reconstructed from the fragment's screen
  // position. Orthographic cameras emit parallel rays, so using the inverse
  // projection here would incorrectly make the skybox direction vary across
  // the screen.
  if (camera.projection[3][3] == 1.0) {
    viewDirection = vec3(0.0, 0.0, -1.0);
  } else {
    vec2 ndc = v_uv * 2.0 - 1.0;
    vec4 clip = vec4(ndc, 1.0, 1.0);
    vec4 viewRay = inverse(camera.projection) * clip;
    viewDirection = normalize(viewRay.xyz / viewRay.w);
  }

  vec3 worldDirection = normalize((inverse(camera.view) * vec4(viewDirection, 0.0)).xyz);

  return normalize((inverse(model) * vec4(worldDirection, 0.0)).xyz);
}

void main() {
  vec3 direction = getSkyboxDirection();
  fragment_color = mix(texture(day, direction), texture(night, direction), lerp);
}
