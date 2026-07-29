#include <common>

in vec3 position;

uniform CameraBlock {
  Camera camera;
};
uniform SkyBoxBlock {
  mat4 model;
  float lerp;
};

out highp vec3 v_uv;
  
void main(){
  mat4 view = camera.view;
  view[3].xyz = vec3(0.0);
  v_uv = position;
  gl_Position = camera.projection * view * model * vec4(position.xyz, 1.0);
  gl_Position = gl_Position.xyww;
}
