struct SpriteInstance {
  mat4 transform;
  vec4 uv_rect;
  vec4 tint;
  float alpha_cutoff;
};

uniform SpriteInstanceBlock {
  SpriteInstance sprite_instance;
};

in vec2 v_uv;

uniform sampler2D sprite_texture;

out vec4 fragment_color;

void main() {
  vec4 color = texture(sprite_texture, v_uv);
  color *= sprite_instance.tint;

  #ifdef ALPHA_MASK_MODE
    if (color.a < sprite_instance.alpha_cutoff) {
      discard;
    }
  #endif

  fragment_color = color;
}
