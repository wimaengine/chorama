#include <common>
#include <math>
#include <light>

struct PhongMaterial {
  vec4 color;
  float specularShininess;
  float specularStrength;
};

in vec3 v_position;
#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif
in vec3 v_normal;
in vec3 cam_direction;

uniform MaterialBlock {
  PhongMaterial material;
};
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
  vec3 base_color = material.color.rgb;
  #ifdef VERTEX_UVS
    vec4 sample_color = texture(mainTexture,v_uv);
    base_color *= sample_color.rgb;
  #endif
  #ifdef VERTEX_NORMALS
    vec3 normal = normalize(v_normal);
  #else
    #error "Mesh vertex normals are required for lighting."
  #endif
  vec3 view_direction = normalize(cam_direction);
  float opacity = material.color.a;
  int directional_light_count = min(directional_lights.count,MAX_DIRECTIONAL_LIGHTS);
  int point_light_count = min(point_lights.count,MAX_POINT_LIGHTS);
  int spot_light_count = min(spot_lights.count,MAX_SPOT_LIGHTS);
  
  vec3 total_exitance = vec3(0.0);
  for (int i = 0; i < directional_light_count; i++) {
    DirectionalLight light = directional_lights.lights[i];
    vec3 reflection_direction = reflect(light.direction, normal);
    vec3 irradiance = light.color.rgb;
    //Remember you set the dir to negative because light direction is the opposite direction of dir.
    float diffuse_brightness = calculate_brightness(normal,-light.direction);    
    
    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_2d(shadow, shadow_atlas, v_position, diffuse_brightness);
      }
    #endif
    
    vec3 diffuse = base_color * irradiance * diffuse_brightness * light.intensity;
  
    float specular_brightness = calculate_brightness(reflection_direction,view_direction);
    vec3 specular = pow(specular_brightness,material.specularShininess) * irradiance * material.specularStrength;

    total_exitance += specular + diffuse;
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

    vec3 reflection_direction = reflect(direction, normal);
    vec3 diffuse_exitance = base_color * brightness * irradiance;
    
    float specular_brightness = calculate_brightness(reflection_direction, -view_direction);
    vec3 specular_exitance = pow(specular_brightness,material.specularShininess) * irradiance * material.specularStrength;
    total_exitance += specular_exitance + diffuse_exitance;
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

    vec3 reflection_direction = reflect(direction, normal);
    vec3 diffuse_exitance = base_color * brightness * irradiance;
    float specular_brightness = calculate_brightness(reflection_direction, -view_direction);
    vec3 specular_exitance = pow(specular_brightness,material.specularShininess) * irradiance * material.specularStrength;

    total_exitance += specular_exitance + diffuse_exitance;
  }
  
  vec3 ambient = base_color * ambient_light.color.rgb * ambient_light.intensity;
  vec3 final_color = ambient + total_exitance;
  
  fragment_color = vec4(final_color, opacity);
}
