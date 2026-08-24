#include <math>
#include <color>
#include <common>
#include <light>

struct PBRInput {
  float NdotL;
  float NdotV;
  float NdotH;
  float HdotV;
};

struct PBRProperties {
  vec3 normal;
  vec3 albedo;
  vec3 emissive;
  float opacity;
  float metallic;
  float roughness; 
  float ambient_occlusion;
  float reflection_strength;
  float transmission;
  float thickness;
  float ior;
};

struct StandardMaterial {
  vec4 color;
  float metallic;
  float roughness;
  float ambient_occlusion_strength;
  vec3 emissive_color;
  float emissive_intensity;
  float reflection_strength;
  float transmission;
  float thickness;
  float ior;
  float alpha_cutoff;
};

in vec3 v_position;
#ifdef VERTEX_UVS
  in vec2 v_uv;
#endif
#ifdef VERTEX_COLORS
  in vec4 v_color;
#endif
#ifdef VERTEX_NORMALS
  in vec3 v_normal;
#endif
#ifdef VERTEX_TANGENTS
  in vec4 v_tangent;
#endif
in vec3 cam_direction;

uniform MaterialBlock {
  StandardMaterial material;
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
uniform sampler2D normal_texture;
uniform sampler2D occlusion_texture;
uniform sampler2D roughness_texture;
uniform sampler2D metallic_texture;
uniform sampler2D transmission_texture;
uniform sampler2D thickness_texture;
uniform sampler2D emissive_texture;
uniform samplerCube environment_map;

out vec4 fragment_color;

vec3 fresnel_schlick(float HdotV, vec3 F0){
  return F0 + (1.0 - F0) * pow(clamp(1.0 - HdotV, 0.0, 1.0), 5.0);
}

float environment_lod(float roughness) {
  ivec2 env_size = textureSize(environment_map, 0);
  float levels = max(log2(float(max(env_size.x, env_size.y))), 0.0);
  return roughness * roughness * levels;
}

vec3 sample_environment_reflection(vec3 N, vec3 V, float roughness) {
  vec3 reflection_direction = reflect(-V, N);
  return textureLod(environment_map, reflection_direction, environment_lod(roughness)).rgb;
}

vec3 sample_environment_refraction(vec3 N, vec3 V, float roughness, float ior) {
  vec3 refraction_direction = refract(-V, N, 1.0 / ior);

  if (dot(refraction_direction, refraction_direction) <= 0.0) {
    return vec3(0.0);
  }

  return textureLod(environment_map, refraction_direction, environment_lod(roughness)).rgb;
}

// Also the Trowbridge-Rietz normal distribution function
float GGX_normal_distribution(float NdotH, float roughness){
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH2 = NdotH * NdotH;  
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;

  return a2 / denom;
}

float geometry_schlickGGX(float NdotV, float roughness){
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  float denom = NdotV * (1.0 - k) + k;

  return NdotV / denom;
}

float geometry_smith(float NdotV, float NdotL, float roughness){
  float ggx2 = geometry_schlickGGX(NdotV, roughness);
  float ggx1 = geometry_schlickGGX(NdotL, roughness);

  return ggx1 * ggx2;
}

vec3 cook_torrance_BRDF(PBRProperties pbr_properties, PBRInput pbr_input){
  vec3 F0 = mix(vec3(0.04), pbr_properties.albedo, pbr_properties.metallic);
  vec3 F = fresnel_schlick(pbr_input.HdotV, F0);

  float NDF = GGX_normal_distribution(pbr_input.NdotH, pbr_properties.roughness);
  float G = geometry_smith(pbr_input.NdotV, pbr_input.NdotL, pbr_properties.roughness);

  vec3 numerator = NDF * G * F;
  float denominator = 4.0 * pbr_input.NdotV * pbr_input.NdotL  + 0.0001;
  vec3 specular = numerator / denominator;
  vec3 kS = F;
  vec3 kD = (vec3(1.0) - kS) * (1.0 - pbr_properties.metallic);

  return (kD * pbr_properties.albedo / PI + specular);
}

PBRInput calculate_pbr_input(vec3 N, vec3 V, vec3 L, vec3 H){
  PBRInput pbr_input;

  pbr_input.NdotV = max(dot(N, V), 0.0);
  pbr_input.NdotL = max(dot(N, L), 0.0);
  pbr_input.NdotH = max(dot(N, H), 0.0);
  pbr_input.HdotV = max(dot(H, V), 0.0);

  return pbr_input;
}

PBRProperties calculate_pbr_properties(){
  PBRProperties properties;

  properties.albedo = material.color.rgb;
  properties.emissive = material.emissive_color;
  properties.opacity = material.color.a;
  properties.metallic = material.metallic;
  properties.roughness = material.roughness;
  properties.ambient_occlusion = 1.0;
  properties.reflection_strength = material.reflection_strength;
  properties.transmission = material.transmission;
  properties.thickness = material.thickness;
  properties.ior = max(material.ior, 1.0);

  #ifdef VERTEX_COLORS
    properties.albedo *= v_color.rgb;
    properties.opacity *= v_color.a;
  #endif
  #ifdef VERTEX_UVS
    vec4 albedo_texture_color = texture(mainTexture,v_uv);
    properties.albedo *= quick_sRGB_to_linear(albedo_texture_color.rgb);
    properties.opacity *= albedo_texture_color.a;

    vec4 metallic_texture_color = texture(metallic_texture,v_uv);
    properties.metallic *= metallic_texture_color.b;
    
    vec4 roughness_texture_color = texture(roughness_texture,v_uv);
    properties.roughness *= roughness_texture_color.g;
    
    vec4 occlusion_texture_color = texture(occlusion_texture,v_uv);
    properties.ambient_occlusion = mix(1.0,occlusion_texture_color.r, material.ambient_occlusion_strength);
    
    vec4 emissive_texture_color = texture(emissive_texture,v_uv);
    properties.emissive *= emissive_texture_color.rgb;  
  #endif

  properties.metallic = clamp(properties.metallic, 0.0, 1.0);
  properties.roughness = clamp(properties.roughness, 0.05, 1.0);
  properties.reflection_strength = clamp(properties.reflection_strength, 0.0, 1.0);
  properties.transmission = clamp(properties.transmission, 0.0, 1.0) * (1.0 - properties.metallic);

  #ifdef VERTEX_UVS
    vec4 transmission_texture_color = texture(transmission_texture, v_uv);
    properties.transmission *= transmission_texture_color.r;

    vec4 thickness_texture_color = texture(thickness_texture, v_uv);
    properties.thickness *= thickness_texture_color.r;
  #endif

  properties.transmission = clamp(properties.transmission, 0.0, 1.0);
  properties.thickness = max(properties.thickness, 0.0);

  #if defined(VERTEX_TANGENTS)
    #ifdef VERTEX_NORMALS
      vec3 normal = normalize(v_normal);
    #else
      #error "Mesh vertex normals are required for lighting."
    #endif
    #ifdef VERTEX_UVS
      vec3 tangent = normalize(v_tangent.xyz);
      vec3 bitangent = cross(normal, tangent) * v_tangent.w;
      mat3 tangent_space = mat3(tangent, bitangent, normal);
      vec3 surface_normal = texture(normal_texture, v_uv).rgb * 2.0 - 1.0;
      properties.normal = tangent_space * surface_normal;
    #else
      properties.normal = normal;
    #endif
  #else
    #ifdef VERTEX_NORMALS
      properties.normal = v_normal;
    #else
      #error "Mesh vertex normals are required for lighting."
    #endif
  #endif

  return properties;
}

void main(){
  PBRProperties pbr_properties = calculate_pbr_properties();
#ifdef ALPHA_MASK_MODE
  if (pbr_properties.opacity < material.alpha_cutoff) {
    discard;
  }
#endif
  vec3 N = normalize(pbr_properties.normal);
  vec3 V = normalize(cam_direction);
    int directional_light_count = min(directional_lights.count,MAX_DIRECTIONAL_LIGHTS);
  int point_light_count = min(point_lights.count, MAX_POINT_LIGHTS);
  int spot_light_count = min(spot_lights.count,MAX_SPOT_LIGHTS);

  vec3 exitance = vec3(0.0);
  for (int i = 0; i < directional_light_count; i++) {
    DirectionalLight light = directional_lights.lights[i];
    vec3 L = -light.direction;
    vec3 H = normalize(L + V);
    PBRInput pbr_input = calculate_pbr_input(N, V, L, H);
    vec3 irradiance = light.color.rgb * light.intensity;

    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_2d(shadow, shadow_atlas, v_position, pbr_input.NdotL);
      }
    #endif      
    exitance += cook_torrance_BRDF(pbr_properties, pbr_input) * irradiance * pbr_input.NdotL;
  }

  for (int i = 0; i < point_light_count; i++) {
    PointLight light = point_lights.lights[i];
    vec3 normal = N;
    vec3 distance_vector = light.position - v_position;
    float distance = length(distance_vector);
    vec3 L = distance_vector / distance;
    vec3 H = normalize(L + V);
    PBRInput pbr_input = calculate_pbr_input(N, V, L, H);
    float attenuation = attenuate_point_light(distance, light.radius, light.intensity, light.decay);
    vec3 irradiance = light.color.rgb * attenuation;
    
    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_cube(shadow, shadow_atlas, v_position, pbr_input.NdotL);
      }
    #endif

    exitance += cook_torrance_BRDF(pbr_properties, pbr_input) * irradiance * pbr_input.NdotL;
  }

  for (int i = 0; i < spot_light_count; i++) {
    SpotLight light = spot_lights.lights[i];
    vec3 normal = N;
    vec3 distance_vector = light.position - v_position;
    float distance = length(distance_vector);
    vec3 L = distance_vector / distance;
    vec3 H = normalize(L + V);
    PBRInput pbr_input = calculate_pbr_input(N, V, L, H);
    float attenuation = attenuate_spot_light(light, L, distance);
    vec3 irradiance = light.color.rgb * attenuation;
    
    #ifdef MAX_SHADOW_CASTERS
      if(light.shadow_index != -1){
        Shadow shadow = shadow_casters[light.shadow_index];
        
        irradiance *= shadow_contribution_2d(shadow, shadow_atlas, v_position, pbr_input.NdotL);
      }
    #endif

    exitance += cook_torrance_BRDF(pbr_properties, pbr_input) * irradiance * pbr_input.NdotL;
  }

  vec3 emissive_exitance = pbr_properties.emissive * material.emissive_intensity;
  vec3 ambient_exitance = pbr_properties.albedo * ambient_light.color.rgb * ambient_light.intensity * pbr_properties.ambient_occlusion;
  vec3 surface_exitance = emissive_exitance + ambient_exitance + exitance;
  vec3 reflection_exitance = sample_environment_reflection(N, V, pbr_properties.roughness);
  vec3 refraction_exitance = sample_environment_refraction(N, V, pbr_properties.roughness, pbr_properties.ior);
  vec3 F0 = mix(vec3(0.04), pbr_properties.albedo, pbr_properties.metallic);
  float NdotV = max(dot(N, V), 0.0);
  vec3 fresnel = fresnel_schlick(NdotV, F0);
  float reflection_mix = max(max(fresnel.r, fresnel.g), fresnel.b) * pbr_properties.reflection_strength;
  float transmission_mix = pbr_properties.transmission * exp(-pbr_properties.thickness) * (1.0 - max(max(fresnel.r, fresnel.g), fresnel.b));
  vec3 final_color = mix(surface_exitance, refraction_exitance, transmission_mix);
  final_color += reflection_exitance * reflection_mix;

  fragment_color = vec4(final_color, pbr_properties.opacity);
}
