#include <common>

in highp vec3 v_uv;

uniform SkyBoxBlock {
  mat4 model;
  float lerp;
};
uniform samplerCube day;
uniform samplerCube night;

out vec4 fragment_color;

void main(){
  fragment_color = mix(texture(day, v_uv), texture(night,v_uv), lerp);
}
