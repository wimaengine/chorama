vec3 reinhard_tonemapping(vec3 color) {
  return color / (color + vec3(1.0));
}

vec3 aces_filmic_tonemapping(vec3 color) {
  return clamp(
    (color * (2.51 * color + vec3(0.03))) /
    (color * (2.43 * color + vec3(0.59)) + vec3(0.14)),
    0.0,
    1.0
  );
}

vec3 hable_curve(vec3 color) {
  const float A = 0.15;
  const float B = 0.50;
  const float C = 0.10;
  const float D = 0.20;
  const float E = 0.02;
  const float F = 0.30;

  return (
    (color * (A * color + C * B) + D * E) /
    (color * (A * color + B) + D * F)
  ) - E / F;
}

vec3 hable_tonemapping(vec3 color) {
  const float white_point = 11.2;

  float white_scale = 1.0 / hable_curve(vec3(white_point)).r;

  return clamp(hable_curve(color) * white_scale, 0.0, 1.0);
}

vec3 agx_default_contrast_approx(vec3 color) {
  vec3 color_squared = color * color;
  vec3 color_quad = color_squared * color_squared;

  return
    15.5 * color_quad * color_squared -
    40.14 * color_quad * color +
    31.96 * color_quad -
    6.868 * color_squared * color +
    0.4298 * color_squared +
    0.1191 * color -
    0.00232;
}

vec3 agx_tonemapping(vec3 color) {
  const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
    vec3(0.6274, 0.0691, 0.0164),
    vec3(0.3293, 0.9195, 0.0880),
    vec3(0.0433, 0.0113, 0.8956)
  );
  const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
    vec3(1.6605, -0.1246, -0.0182),
    vec3(-0.5876, 1.1329, -0.1006),
    vec3(-0.0728, -0.0083, 1.1187)
  );
  const mat3 AGX_INSET_MATRIX = mat3(
    vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
    vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
    vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859)
  );
  const mat3 AGX_OUTSET_MATRIX = mat3(
    vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405)
  );
  const float min_ev = -12.47393;
  const float max_ev = 4.026069;

  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = AGX_INSET_MATRIX * color;
  color = max(color, vec3(1e-10));
  color = log2(color);
  color = (color - min_ev) / (max_ev - min_ev);
  color = clamp(color, 0.0, 1.0);
  color = agx_default_contrast_approx(color);
  color = AGX_OUTSET_MATRIX * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;

  return clamp(color, 0.0, 1.0);
}

vec3 khronos_pbr_neutral_tonemapping(vec3 color) {
  const float start_compression = 0.8 - 0.04;
  const float desaturation = 0.15;

  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;

  color -= offset;

  float peak = max(color.r, max(color.g, color.b));
  if (peak < start_compression) {
    return color;
  }

  float d = 1.0 - start_compression;
  float new_peak = 1.0 - d * d / (peak + d - start_compression);

  color *= new_peak / peak;

  float g = 1.0 - 1.0 / (desaturation * (peak - new_peak) + 1.0);

  return mix(color, vec3(new_peak), g);
}
