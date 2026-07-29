#include <math>
#include <common>
#include <light>

struct LambertMaterial {
  vec4 color;
};

in vec3 v_position;
#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif
#ifdef VERTEX_NORMALS
  in vec3 v_normal;
#endif

uniform MaterialBlock {
  LambertMaterial material;
};
// Lights
uniform AmbientLightBlock {
  AmbientLight ambient_light;
};
uniform DirectionalLightBlock {
  DirectionalLights directional_lights;
};
uniform PointLightBlock {
  PointLights point_lights;
};
uniform SpotLightBlock {
  SpotLights spot_lights;
};

#ifdef MAX_SHADOW_CASTERS
  uniform ShadowCasterBlock {
    Shadow shadow_casters[MAX_SHADOW_CASTERS];
  };
  uniform sampler2DArray shadow_atlas;
#endif
uniform sampler2D mainTexture;
out vec4 fragment_color;

void main(){
  vec3 base_color =  material.color.rgb;
  
  #ifdef VERTEX_UVS
    vec4 sample_color = texture(mainTexture,v_uv);
    base_color *= sample_color.rgb;
  #endif
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    #error "Mesh vertex normals are required for lighting."
  #endif
  float opacity = material.color.a;
  int directional_light_count = min(directional_lights.count,MAX_DIRECTIONAL_LIGHTS);
  int point_light_count = min(point_lights.count,MAX_POINT_LIGHTS);
  int spot_light_count = min(spot_lights.count,MAX_SPOT_LIGHTS);

  vec3 ambient = ambient_light.color.rgb * ambient_light.intensity;
  
  vec3 total_exitance = vec3(0.0, 0.0, 0.0);
  for (int i = 0; i < directional_light_count; i++) {
    DirectionalLight light = directional_lights.lights[i];
    //Remember you set the dir to negative because direction to light is the opposite direction of dir.
    vec3 light_direction = -light.direction;
    float brightness = calculate_brightness(normal, light_direction);
    vec3 irradiance = light.color.rgb * brightness * light.intensity;
    
    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_2d(shadow, shadow_atlas, v_position, brightness);
      }
    #endif
    total_exitance += base_color * irradiance;
  }
  
  for (int i = 0; i < point_light_count; i++) {
    PointLight light = point_lights.lights[i];
    vec3 distance_vector = light.position - v_position;
    float distance = length(distance_vector);
    vec3 direction = distance_vector / distance;
    float attenuation = attenuate_point_light(distance, light.radius, light.intensity, light.decay);
    float brightness = calculate_brightness(normal, direction);
    vec3 irradiance = light.color.rgb * attenuation;

    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_cube(shadow, shadow_atlas, v_position, brightness);
      }
    #endif

    total_exitance += base_color * brightness * irradiance;
  }

  for (int i = 0; i < spot_light_count; i++) {
    SpotLight light = spot_lights.lights[i];
    vec3 distance_vector = light.position - v_position;
    float distance = length(distance_vector);
    vec3 direction = distance_vector / distance;
    float attenuation = attenuate_spot_light(light, direction, distance);
    float brightness = calculate_brightness(normal, direction);
    vec3 irradiance = light.color.rgb * attenuation;
   
    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_2d(shadow, shadow_atlas, v_position, brightness);
      }
    #endif
    
    total_exitance += base_color * brightness * irradiance;
  }
  
  vec3 final_color = ambient * base_color + total_exitance;
  
  fragment_color = vec4(final_color,opacity);
}
