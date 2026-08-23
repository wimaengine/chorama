import { Color } from "../math/index.js";
import { AlphaMaskMode, OpaqueMode } from "./alphablend.js";
import { basicVertex, standardFragment } from "../shader/index.js";
import { Sampler, Texture } from "../texture/index.js";
import { Material } from "./material.js";

export class StandardMaterial extends Material {
  /**
   * @type {Color}
   */
  color

  /**
   * @type {Texture | undefined}
   */
  mainTexture

  /**
   * @type {Sampler | undefined}
   */
  mainSampler

  /**
   * @type {Texture | undefined}
   */
  normalTexture

  /**
   * @type {Sampler | undefined}
   */
  normalSampler

  /**
   * @type {number}
   */
  metallic

  /**
   * @type {Texture | undefined}
   */
  metallicTexture
  /**
   * @type {Sampler | undefined}
   */
  metallicSampler

  /**
   * @type {number}
   */
  roughness

  /**
   * @type {Texture | undefined}
   */
  roughnessTexture

  /**
   * @type {Sampler | undefined}
   */
  roughnessSampler

  /**
   * @type {number}
   */
  occlusionStrength
  /**
   * @type {Texture | undefined}
   */
  occlusionTexture

  /**
   * @type {Sampler | undefined}
   */
  occlusionSampler

  /**
   * @type {Color}
   */
  emissiveColor

  /**
   * @type {number}
   */
  emissiveIntensity

  /**
   * @type {number}
   */
  reflectionStrength

  /**
   * @type {number}
   */
  transmission

  /**
   * @type {Texture | undefined}
   */
  transmissionTexture

  /**
   * @type {Sampler | undefined}
   */
  transmissionSampler

  /**
   * @type {number}
   */
  thickness

  /**
   * @type {Texture | undefined}
   */
  thicknessTexture

  /**
   * @type {Sampler | undefined}
   */
  thicknessSampler

  /**
   * @type {number}
   */
  ior

  /**
   * @type {Texture | undefined}
   */
  emissiveTexture

  /**
   * @type {Sampler | undefined}
   */
  emissiveSampler

  /**
   * @type {import("./alphablend.js").AlphaBlend}
   */
  alphaBlend = new OpaqueMode()

  /**
   * @param {StandardMaterialOptions} param0 
   */
  constructor({
    color = new Color(1, 1, 1),
    mainTexture,
    mainSampler,
    normalTexture,
    normalSampler,
    metallic = 1,
    metallicTexture,
    metallicSampler,
    roughness = 0,
    roughnessTexture,
    roughnessSampler,
    occlusionStrength = 1,
    occlusionTexture,
    occlusionSampler,
    emissiveColor = new Color(0, 0, 0),
    emissiveIntensity = 1,
    reflectionStrength = 1,
    transmission = 0,
    transmissionTexture,
    transmissionSampler,
    thickness = 0,
    thicknessTexture,
    thicknessSampler,
    ior = 1.5,
    emissiveTexture,
    emissiveSampler
  } = {}) {
    super()
    this.color = color;
    this.mainTexture = mainTexture;
    this.mainSampler = mainSampler;

    this.normalTexture = normalTexture;
    this.normalSampler = normalSampler;

    this.metallic = metallic;
    this.metallicTexture = metallicTexture;
    this.metallicSampler = metallicSampler;

    this.roughness = roughness;
    this.roughnessTexture = roughnessTexture;
    this.roughnessSampler = roughnessSampler;

    this.occlusionStrength = occlusionStrength
    this.occlusionTexture = occlusionTexture;
    this.occlusionSampler = occlusionSampler;

    this.emissiveColor = emissiveColor;
    this.emissiveIntensity = emissiveIntensity;
    this.reflectionStrength = reflectionStrength;
    this.transmission = transmission;
    this.transmissionTexture = transmissionTexture;
    this.transmissionSampler = transmissionSampler;
    this.thickness = thickness;
    this.thicknessTexture = thicknessTexture;
    this.thicknessSampler = thicknessSampler;
    this.ior = ior;
    this.emissiveTexture = emissiveTexture;
    this.emissiveSampler = emissiveSampler;
  }

  /**
   * @override
   */
  vertex() {
    return basicVertex
  }

  /**
   * @override
   */
  fragment() {
    return standardFragment
  }

  /**
   * @override
   * @returns {import("./alphablend.js").AlphaBlend}
   */
  alphaBlendMode() {
    return this.alphaBlend
  }

  /**
   * @override
   */
  getData() {
    const {
      color,
      metallic,
      roughness,
      occlusionStrength,
      emissiveColor,
      emissiveIntensity,
      reflectionStrength,
      transmission,
      thickness,
      ior
    } = this
    const alphaCutoff = this.alphaBlend instanceof AlphaMaskMode ? this.alphaBlend.cutoff : 0.5

    return new Float32Array([
      ...color,
      metallic,
      roughness,
      occlusionStrength,
      0,
      emissiveColor.r,
      emissiveColor.g,
      emissiveColor.b,
      emissiveIntensity,
      reflectionStrength,
      transmission,
      thickness,
      ior,
      alphaCutoff
    ]).buffer
  }

  /**
   * @override
   * @returns {[string, number, Texture | undefined, Sampler | undefined][]}
   */
  getTextures() {
    return [
      ['mainTexture', 0, this.mainTexture, this.mainSampler],
      ['normal_texture', 0, this.normalTexture, this.normalSampler],
      ['metallic_texture', 0, this.metallicTexture, this.metallicSampler],
      ['roughness_texture', 0, this.roughnessTexture, this.roughnessSampler],
      ['transmission_texture', 0, this.transmissionTexture, this.transmissionSampler],
      ['thickness_texture', 0, this.thicknessTexture, this.thicknessSampler],
      ['occlusion_texture', 0, this.occlusionTexture, this.occlusionSampler],
      ['emissive_texture', 0, this.emissiveTexture, this.emissiveSampler]
    ]
  }
}


/**
 * @typedef StandardMaterialOptions
 * @property {Color} [color] The base color of the material.
 * @property {Texture} [mainTexture] The color texture applied to the material.
 * @property {Sampler} [mainSampler] The sampler for the color texture.
 * @property {Texture} [normalTexture] The texture used for normal mapping to simulate surface detail.
 * @property {Sampler} [normalSampler] The sampler for the normal map.
 * @property {number} [metallic] The metallic value of the material, typically between 0 and 1.
 * @property {Texture} [metallicTexture] A texture representing metallic values, typically a grayscale image.
 * @property {Sampler} [metallicSampler] The sampler for the metallic texture.
 * @property {number} [roughness] The roughness value of the material, typically between 0 and 1.
 * @property {Texture} [roughnessTexture] A texture representing the roughness values, typically a grayscale image.
 * @property {Sampler} [roughnessSampler] The sampler for the roughness texture.
 * @property {number} [occlusionStrength]  The strength of the ambient occlusion. 
 * @property {Texture} [occlusionTexture] A texture used for ambient occlusion to simulate shadowing of surfaces.
 * @property {Sampler} [occlusionSampler] The sampler for the ambient occlusion texture.
 * @property {Color} [emissiveColor] The color of emissive light emitted by the material.
 * @property {number} [emissiveIntensity] The intensity of the emissive color.
 * @property {number} [reflectionStrength] The strength of the environment reflection contribution.
 * @property {number} [transmission] The strength of the environment refraction contribution.
 * @property {Texture} [transmissionTexture] A texture that modulates transmission by its red channel.
 * @property {Sampler} [transmissionSampler] The sampler for the transmission texture.
 * @property {number} [thickness] The thickness used to attenuate transmission.
 * @property {Texture} [thicknessTexture] A texture that modulates thickness by its red channel.
 * @property {Sampler} [thicknessSampler] The sampler for the thickness texture.
 * @property {number} [ior] The index of refraction used for transmission.
 * @property {Texture} [emissiveTexture] A texture representing the emissive map.
 * @property {Sampler} [emissiveSampler] The sampler for the emissive texture.
 */
