in vec2 v_uv;

out vec4 fragment_color;

uniform sampler2D mainTexture;

void main() {
  fragment_color = texture(mainTexture, v_uv);
}
