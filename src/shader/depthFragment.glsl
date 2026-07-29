#include <math>
#include <common>

struct CameraParams {
  float near;
  float far;
};

#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif

uniform MaterialBlock {
  CameraParams params;
};
uniform sampler2D depth_texture;

out vec4 fragment_color;

void main(){
  #ifdef VERTEX_UVS
    float sample_depth = texture(depth_texture, v_uv).r / 1.0;
    float linear_depth = linearize_depth(sample_depth, params.near, params.far) / params.far;
    float visual_depth = (sample_depth - params.near) / (params.far - params.near); 
    fragment_color = vec4(
      linear_depth,
      linear_depth,
      linear_depth,
      1.0
    );
  #else
    fragment_color = vec4(1.0, 0.0, 0.0, 1.0);
  #endif
}
