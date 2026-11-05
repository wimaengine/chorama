#include <common>

struct SpriteInstance {
  mat4 transform;
  vec4 uv_rect;
  vec4 size;
  vec4 tint;
  float alpha_cutoff;
};

uniform CameraBlock {
  Camera camera;
};

uniform SpriteInstanceBlock {
  SpriteInstance sprite_instance;
};

const vec2 SPRITE_POSITIONS[6] = vec2[6](
  vec2(-0.5, 0.5),
  vec2(0.5, 0.5),
  vec2(-0.5, -0.5),
  vec2(0.5, 0.5),
  vec2(0.5, -0.5),
  vec2(-0.5, -0.5)
);

const vec2 SPRITE_UVS[6] = vec2[6](
  vec2(0.0, 1.0),
  vec2(1.0, 1.0),
  vec2(0.0, 0.0),
  vec2(1.0, 1.0),
  vec2(1.0, 0.0),
  vec2(0.0, 0.0)
);

out vec2 v_uv;

void main() {
  vec2 position = SPRITE_POSITIONS[gl_VertexID];
  vec2 uv = SPRITE_UVS[gl_VertexID];
  position *= sprite_instance.size.xy;

  vec3 world_space_position = (sprite_instance.transform * vec4(position, 0.0, 1.0)).xyz;
  v_uv = sprite_instance.uv_rect.xy + uv * (sprite_instance.uv_rect.zw - sprite_instance.uv_rect.xy);
  gl_Position = camera.projection * camera.view * vec4(world_space_position, 1.0);
}
