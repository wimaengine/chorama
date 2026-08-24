/**@import { LoadSettings } from './loader.js' */
import { Attribute, Mesh } from '../mesh/index.js';
import { StandardMaterial, AlphaMaskMode, OpaqueMode, TransparentMode } from '../material/index.js';
import { Camera, DirectionalLight, MeshMaterial3D, Object3D, OrthographicProjection, PerspectiveProjection, PointLight, Skin, SpotLight } from '../objects/index.js';
import { Loader } from './loader.js';
import { arrayBufferToJSON } from './utils.js';
import { Bone3D } from '../objects/bone.js';
import { Affine3 } from '../math/index.js';
import { SeparateAttributeData } from '../mesh/attributedata/separate.js';
import { TextureLoader } from './texture.js';
import { Texture, Sampler } from '../texture/index.js';
import { assert } from '../utils/index.js';
import { CullFace, TextureFilter, TextureType, TextureWrap } from '../constants/index.js';

const defaultMaterial = new StandardMaterial()
const GLB_MAGIC = 0x46546C67
const GLB_CHUNK_TYPE_JSON = 0x4E4F534A
const GLB_CHUNK_TYPE_BIN = 0x004E4942
const GLTF_LIGHTS_PUNCTUAL_EXTENSION = "KHR_lights_punctual"
// Keep the fallback finite so attenuation and shadow math remain stable.
const DEFAULT_GLTF_LIGHT_RANGE = 1000
/**
 * @extends {Loader<Object3D, GLTFLoadSettings>}
 */
export class GLTFLoader extends Loader {
  textureLoader
  constructor({ textureLoader = new TextureLoader() } = {}) {
    super(Object3D)
    this.textureLoader = textureLoader
  }
  /**
   * @override
   * @param {ArrayBuffer[]} buffers
   * @param {Object3D} destination
   * @param {GLTFLoadSettings} settings
   */
  async parse(buffers, destination, settings) {
    const buffer = buffers[0]
    const path = settings.paths[0]
    if (!buffer || !path) {
      return
    }

    /**@type {Map<number, Object3D>} */
    const entityMap = new Map()
    const baseUrl = new URL(path, location.href).href
    const gltf = await loadGLTF(buffer, baseUrl)
    const scene = gltf.scenes[gltf.scene]

    if (!scene) {
      throw "No root scene defined"
    }

    const images = await Promise.all(gltf.images.map(async (gltfTexture) => {
      if (gltfTexture.uri) {
        return this.textureLoader.asyncLoad({
          paths: [new URL(gltfTexture.uri, baseUrl).href]
        })
      }

      if (typeof gltfTexture.bufferView === "number") {
        const bufferView = gltf.bufferViews[gltfTexture.bufferView]
        assert(bufferView, "GLTF image does not have a valid buffer view")

        const imageBuffer = gltf.buffers[bufferView.buffer]
        assert(imageBuffer, "GLTF image buffer view does not have a valid buffer")

        const texture = new Texture({
          type: TextureType.Texture2D
        })
        const slice = imageBuffer.slice(
          bufferView.offset,
          bufferView.offset + bufferView.length
        )
        await this.textureLoader.parse([slice], texture, {
          mimeType: gltfTexture.mimeType
        })
        return texture
      }

      throw "Unsupported gltf image setting"
    }))
    const samplers = gltf.samplers.map((gltfSampler) => createGLTFSampler(gltfSampler))

    /**
     * @type {[Texture, Sampler][]}
     */
    const textures = gltf.textures.map((gltfTextures) => {
      const image = images[gltfTextures.source]
      assert(image, "GLTF texture does not have an image source")

      if (gltfTextures.sampler !== undefined) {
        const sampler = samplers[gltfTextures.sampler]
        assert(sampler, "GLTF texture does not have a valid sampler")
        return [image, sampler]
      }
      return [image, createDefaultGLTFSampler()]
    })
    const materials = gltf.materials.map((gltfMaterial) => {
      const {
        emissiveFactor,
        emissiveTexture,
        extensions = {},
        normalTexture,
        occlusionTexture,
        pbrMetallicRoughness
      } = gltfMaterial
      const {
        baseColorFactor,
        baseColorTexture,
        metallicFactor,
        roughnessFactor,
        metallicRoughnessTexture
      } = pbrMetallicRoughness
      const material = new StandardMaterial()

      material.color.set(
        baseColorFactor[0],
        baseColorFactor[1],
        baseColorFactor[2],
        baseColorFactor[3]
      )
      material.emissiveColor.set(
        emissiveFactor[0],
        emissiveFactor[1],
        emissiveFactor[2]
      )
      material.metallic = metallicFactor
      material.roughness = roughnessFactor

      if (baseColorTexture) {
        const texture = textures[baseColorTexture.index]

        if (texture) {
          material.mainTexture = texture[0]
          material.mainSampler = texture[1]
        } else {
          console.warn("gltf: invalid color texture on material");
        }
      }

      if (normalTexture) {
        const texture = textures[normalTexture.index]

        if (texture) {
          material.normalTexture = texture[0]
          material.normalSampler = texture[1]
        } else {
          console.warn("gltf: invalid normal texture on material");
        }
      }

      if (occlusionTexture) {
        const texture = textures[occlusionTexture.index]

        if (texture) {
          material.occlusionStrength = occlusionTexture.strength
          material.occlusionTexture = texture[0]
          material.occlusionSampler = texture[1]
        } else {
          console.warn("gltf: invalid occlusion texture on material");
        }
      }

      if (emissiveTexture) {
        const texture = textures[emissiveTexture.index]

        if (texture) {
          material.emissiveTexture = texture[0]
          material.emissiveSampler = texture[1]
        } else {
          console.warn("gltf: invalid emissive texture on material");
        }
      }

      if (metallicRoughnessTexture) {
        const texture = textures[metallicRoughnessTexture.index]

        if (texture) {
          material.metallicTexture = texture[0]
          material.metallicSampler = texture[1]
          material.roughnessTexture = texture[0]
          material.roughnessSampler = texture[1]
        } else {
          console.warn("gltf: invalid metallic-rougness texture on material");
        }
      }

      const transmissionExtension = extensions["KHR_materials_transmission"]
      if (transmissionExtension) {
        material.transmission = transmissionExtension.transmissionFactor ?? material.transmission

        const transmissionTexture = transmissionExtension.transmissionTexture
        if (transmissionTexture) {
          const texture = textures[transmissionTexture.index]

          if (texture) {
            material.transmissionTexture = texture[0]
            material.transmissionSampler = texture[1]
          } else {
            console.warn("gltf: invalid transmission texture on material");
          }
        }
      }

      const volumeExtension = extensions["KHR_materials_volume"]
      if (volumeExtension) {
        material.thickness = volumeExtension.thicknessFactor ?? material.thickness

        const thicknessTexture = volumeExtension.thicknessTexture
        if (thicknessTexture) {
          const texture = textures[thicknessTexture.index]

          if (texture) {
            material.thicknessTexture = texture[0]
            material.thicknessSampler = texture[1]
          } else {
            console.warn("gltf: invalid thickness texture on material");
          }
        }
      }

      const iorExtension = extensions["KHR_materials_ior"]
      if (iorExtension) {
        material.ior = iorExtension.ior ?? material.ior
      }

      if (gltfMaterial.alphaMode === GLFTAlphaMode.Mask) {
        material.alphaBlend = new AlphaMaskMode(gltfMaterial.alphaCutoff)
      } else if (gltfMaterial.alphaMode === GLFTAlphaMode.Blend) {
        material.alphaBlend = new TransparentMode()
      } else {
        material.alphaBlend = new OpaqueMode()
      }

      if (gltfMaterial.doubleSided) {
        material.cullFace = CullFace.None
      }

      return material
    })
    const geometries = gltf.meshes.map((data) => {
      return parseGeometry(data, gltf)
    })

    gltf.nodes.forEach((node, index) => {
      const object = parseObject(index, node, gltf, geometries, materials)

      if (object) {
        entityMap.set(index, object)
      }
    })

    gltf.nodes.forEach((node, index) => {
      const parent = entityMap.get(index)

      if (!parent) {
        return
      }

      for (const child of node.children) {
        const childEntity = entityMap.get(child)

        if (childEntity) {
          parent.add(childEntity)
        }
      }
    })

    scene.nodes.forEach((node) => {
      entityMap.get(node)?.update()
    });

    const skins = gltf.skins.map((skin) => {
      return parseSkin(skin, gltf, entityMap)
    })

    entityMap.forEach((entity, index) => {
      const node = /**@type {GLTFNode} */ (gltf.nodes[index])
      if (node.skin !== undefined) {
        entity.traverseBFS((mesh) => {
          if (mesh instanceof MeshMaterial3D) {
            mesh.skin = skins[/**@type {number} */ (node.skin)]
          }
          return true
        })
      }
    })

    const sceneEntities = scene.nodes.map((node) => {
      return /**@type {Object3D} */ (entityMap.get(node))
    })

    sceneEntities.forEach((object) => {
      object.traverseDFS((innerObject) => {
        innerObject.update()
        return true
      })
    })


    destination.add(...sceneEntities)
  }

  /**
   * @override
   */
  default() {
    return new Object3D()
  }
}

/**
 * @param {ArrayBuffer} data
 * @param {string} baseUrl
 */
async function loadGLTF(data, baseUrl) {
  const { json, buffers: embeddedBuffers } = parseGLTFAsset(data)
  const buffers = json.buffers instanceof Array
    ? await loadBuffers(baseUrl, json.buffers, embeddedBuffers)
    : embeddedBuffers
  const gltf = GLTF.deserialize(json)
  gltf.buffers = buffers

  return gltf
}

/**
 * @param {string} base
 * @param {{uri?: string; byteLength?: number;}[]} uris
 * @param {ArrayBuffer[]} [embeddedBuffers]
 */
async function loadBuffers(base, uris, embeddedBuffers = []) {
  if (uris.length === 0) {
    return embeddedBuffers.slice()
  }

  return Promise.all(
    uris.map(async (buffer, index) => {
      if (typeof buffer.uri !== "string") {
        const embeddedBuffer = embeddedBuffers[index]
        if (embeddedBuffer !== undefined) {
          if (
            typeof buffer.byteLength === "number" &&
            embeddedBuffer.byteLength < buffer.byteLength
          ) {
            throw new Error(`Embedded buffer ${index} is shorter than declared byteLength`)
          }
          return embeddedBuffer
        }
        throw new Error(`Missing URI for buffer ${index}`)
      }

      const url = buffer.uri.startsWith('data') ?
        buffer.uri :
        new URL(buffer.uri, base).href
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch buffer`);
      return await response.arrayBuffer();
    })
  )
}

/**
 * @param {number} filter
 * @returns {TextureFilter}
 */
function mapGLTFMagnificationFilter(filter) {
  switch (filter) {
    case TextureFilter.Nearest:
      return TextureFilter.Nearest
    case TextureFilter.Linear:
      return TextureFilter.Linear
    default:
      throw "GLTF: Invalid magnification sampler"
  }
}

/**
 * @param {number} filter
 * @returns {[TextureFilter, TextureFilter | undefined]}
 */
function mapGLTFMinificationFilter(filter) {
  switch (filter) {
    case TextureFilter.Nearest:
      return [TextureFilter.Nearest, undefined]
    case TextureFilter.Linear:
      return [TextureFilter.Linear, undefined]
    case 0x2700:
      return [TextureFilter.Nearest, TextureFilter.Nearest]
    case 0x2701:
      return [TextureFilter.Nearest, TextureFilter.Linear]
    case 0x2702:
      return [TextureFilter.Linear, TextureFilter.Nearest]
    case 0x2703:
      return [TextureFilter.Linear, TextureFilter.Linear]
    default:
      throw "GLTF: Invalid minification sampler"
  }
}

/**
 * @param {number} wrap
 * @returns {TextureWrap}
 */
function mapGLTFTextureWrap(wrap) {
  switch (wrap) {
    case TextureWrap.Clamp:
      return TextureWrap.Clamp
    case TextureWrap.MirrorRepeat:
      return TextureWrap.MirrorRepeat
    case TextureWrap.Repeat:
      return TextureWrap.Repeat
    default:
      throw "GLTF: Invalid texture wrap"
  }
}

/**
 * @param {GLFTSampler} [gltfSampler]
 * @returns {Sampler}
 */
function createGLTFSampler(gltfSampler) {
  const sampler = createDefaultGLTFSampler()

  if (gltfSampler?.magFilter !== undefined) {
    sampler.magnificationFilter = mapGLTFMagnificationFilter(gltfSampler.magFilter)
  }

  if (gltfSampler?.minFilter !== undefined) {
    const [minificationFilter, mipmapFilter] = mapGLTFMinificationFilter(gltfSampler.minFilter)
    sampler.minificationFilter = minificationFilter
    sampler.mipmapFilter = mipmapFilter
  }

  if (gltfSampler?.wrapS !== undefined) {
    sampler.wrapS = mapGLTFTextureWrap(gltfSampler.wrapS)
  }

  if (gltfSampler?.wrapT !== undefined) {
    sampler.wrapT = mapGLTFTextureWrap(gltfSampler.wrapT)
  }

  return sampler
}

/**
 * @returns {Sampler}
 */
function createDefaultGLTFSampler() {
  return new Sampler({
    magnificationFilter: TextureFilter.Linear,
    minificationFilter: TextureFilter.Linear,
    mipmapFilter: undefined,
    wrapS: TextureWrap.Repeat,
    wrapT: TextureWrap.Repeat,
    wrapR: TextureWrap.Repeat
  })
}

/**
 * @param {ArrayBuffer} data
 * @returns {{ json: any, buffers: ArrayBuffer[] }}
 */
function parseGLTFAsset(data) {
  if (isGLB(data)) {
    return parseGLB(data)
  }

  return {
    json: arrayBufferToJSON(data),
    buffers: []
  }
}

/**
 * @param {ArrayBuffer} data
 * @returns {boolean}
 */
function isGLB(data) {
  if (data.byteLength < 12) {
    return false
  }

  const view = new DataView(data)
  return view.getUint32(0, true) === GLB_MAGIC
}

/**
 * @param {ArrayBuffer} data
 * @returns {{ json: any, buffers: ArrayBuffer[] }}
 */
function parseGLB(data) {
  const view = new DataView(data)
  if (view.byteLength < 12) {
    throw new Error("Invalid GLB file")
  }

  const magic = view.getUint32(0, true)
  const version = view.getUint32(4, true)
  const length = view.getUint32(8, true)

  if (magic !== GLB_MAGIC) {
    throw new Error("Invalid GLB magic")
  }

  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}`)
  }

  if (length !== data.byteLength) {
    throw new Error("GLB length does not match file size")
  }

  const decoder = new TextDecoder("utf-8")
  let offset = 12
  let json = undefined
  /** @type {ArrayBuffer | undefined} */
  let binBuffer
  let sawJsonChunk = false

  while (offset + 8 <= data.byteLength) {
    const chunkStart = offset
    const chunkLength = view.getUint32(chunkStart, true)
    const chunkType = view.getUint32(chunkStart + 4, true)
    offset = chunkStart + 8

    if (offset + chunkLength > data.byteLength) {
      throw new Error("Invalid GLB chunk length")
    }

    const chunk = data.slice(offset, offset + chunkLength)
    offset += chunkLength

    if (chunkType === GLB_CHUNK_TYPE_JSON) {
      if (sawJsonChunk) {
        throw new Error("GLB file contains multiple JSON chunks")
      }
      if (chunkStart !== 12) {
        throw new Error("GLB JSON chunk must be the first chunk")
      }
      sawJsonChunk = true
      json = JSON.parse(decoder.decode(chunk))
    } else if (chunkType === GLB_CHUNK_TYPE_BIN) {
      binBuffer = chunk
    }
  }

  if (offset !== data.byteLength) {
    throw new Error("GLB file has trailing or truncated chunk data")
  }

  if (json === undefined) {
    throw new Error("GLB file is missing a JSON chunk")
  }

  return {
    json,
    buffers: binBuffer !== undefined ? [binBuffer] : []
  }
}
/**
 * @typedef {LoadSettings} GLTFLoadSettings
 */

class GLTF {
  /**
   * @type {number}
   */
  scene = 0
  /**
   * @type {GLTFScene[]}
   */
  scenes = []
  /**
   * @type {GLTFNode[]}
   */
  nodes = []
  /**
  * @type {GLTFImage[]}
  */
  images = []
  /**
  * @type {GLFTSampler[]}
  */
  samplers = []
  /**
    * @type {GLFTTexture[]}
    */
  textures = []
  /**
   * @type {GLTFMesh[]}
   */
  meshes = []
  /**
   * @type {GLTFCamera[]}
   */
  cameras = []
  /**
  * @type {GLTFMaterial[]}
  */
  materials = []
  /**
   * @type {GLTFSkin[]}
   */
  skins = []
  /**
   * @type {ArrayBuffer[]}
   */
  buffers = []
  /**
   * @type {GLTFBufferView[]}
   */
  bufferViews = []
  /**
   * @type {GLTFAccessor[]}
   */
  accessors = []
  /**
   * @type {GLTFMetaData}
   */
  metaData
  /**
   * @type {Record<string, any>}
   */
  extensions = {}
  /**
   * @type {string[]}
   */
  extensionsUsed = []
  /**
   * @type {string[]}
   */
  extensionsRequired = []

  /**
   * @param {GLTFMetaData} meta
   */
  constructor(meta) {
    this.metaData = meta
  }
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      scene,
      scenes,
      nodes,
      meshes,
      cameras,
      images,
      textures,
      samplers,
      materials,
      bufferViews,
      accessors,
      asset,
      skins,
      extensions,
      extensionsUsed,
      extensionsRequired
    } = data

    if (
      !(asset instanceof Object) ||
      !(scenes instanceof Array) ||
      !(nodes instanceof Array) ||
      !(meshes instanceof Array) ||
      !(bufferViews instanceof Array) ||
      !(accessors instanceof Array)
    ) {
      throw new Error("Invalid gltf json")
    }
    const gltf = new GLTF(GLTFMetaData.deserialize(asset))

    if (typeof scene === "number") {
      gltf.scene = scene
    } else {
      gltf.scene = 0
    }

    gltf.scenes = scenes.map((/**@type {any}*/d) => GLTFScene.deserialize(d))
    gltf.nodes = nodes.map((/**@type {any}*/d) => GLTFNode.deserialize(d))
    gltf.meshes = meshes.map((/**@type {any}*/d) => GLTFMesh.deserialize(d))
    gltf.bufferViews = bufferViews.map((/**@type {any}*/d) => GLTFBufferView.deserialize(d))
    gltf.accessors = accessors.map((/**@type {any}*/d) => GLTFAccessor.deserialize(d))

    if (materials instanceof Array) {
      gltf.materials = materials.map((/**@type {any}*/d) => GLTFMaterial.deserialize(d))
    }

    if (cameras instanceof Array) {
      gltf.cameras = cameras.map((/**@type {any}*/d) => GLTFCamera.deserialize(d))
    } else {
      gltf.cameras = []
    }

    if (images instanceof Array) {
      gltf.images = images.map((/**@type {any}*/d) => GLTFImage.deserialize(d))
    }

    if (samplers instanceof Array) {
      gltf.samplers = samplers.map((/**@type {any}*/d) => GLFTSampler.deserialize(d))
    }

    if (textures instanceof Array) {
      gltf.textures = textures.map((/**@type {any}*/d) => GLFTTexture.deserialize(d))
    }

    if (skins instanceof Array) {
      gltf.skins = skins.map(a => GLTFSkin.deserialize(a))
    } else {
      gltf.skins = []
    }

    if (extensions instanceof Object) {
      gltf.extensions = extensions
    } else {
      gltf.extensions = {}
    }

    if (extensionsUsed instanceof Array) {
      gltf.extensionsUsed = extensionsUsed.filter((value) => typeof value === "string")
    } else {
      gltf.extensionsUsed = []
    }

    if (extensionsRequired instanceof Array) {
      gltf.extensionsRequired = extensionsRequired.filter((value) => typeof value === "string")
    } else {
      gltf.extensionsRequired = []
    }
    return gltf
  }
}

class GLTFScene {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []
  /**
   * @type {number[]}
   */
  nodes = []

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { nodes, name, extensions, extras } = data
    const scene = new GLTFScene()

    if (nodes instanceof Array) {
      scene.nodes = nodes
        .filter((node) => typeof node == "number")
    }

    if (typeof name === "string") {
      scene.name = name
    } else {
      scene.name = ''
    }
    if (extensions instanceof Object) {
      scene.extensions = extensions
    } else {
      scene.extensions = {}
    }
    if (extras instanceof Object) {
      scene.extras = extras
    } else {
      scene.extras = {}
    }
    return scene
  }
}

class GLTFNode {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []
  /**
   * @type {number | undefined}
   */
  mesh
  /**
   * @type {number | undefined}
   */
  skin

  /**
   * @type {number | undefined}
   */
  camera
  /**
   * @type {number[] | undefined}
   */
  weights
  /**
   * @type {number[]}
   */
  children = []
  /**
   * @type {TRSTransform | MatrixTransform | undefined}
   */
  transform
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      mesh, matrix, translation,
      rotation, scale, weights,
      children, skin, camera,
      name, extensions, extras
    } = data
    const node = new GLTFNode()

    if (typeof mesh === "number") {
      node.mesh = mesh
    }
    if (typeof skin === 'number') {
      node.skin = skin
    }
    if (typeof camera === 'number') {
      node.camera = camera
    }
    if (weights instanceof Array) {
      node.weights = weights.filter(w => typeof w === "number")
    }
    if (matrix) {
      node.transform = MatrixTransform.deserialize(matrix)
    }
    if (translation || rotation || scale) {
      const ntranslation = translation || [0, 0, 0]
      const nrotation = rotation || [0, 0, 0, 1]
      const nscale = scale || [1, 1, 1]
      node.transform = TRSTransform.deserialize(
        ntranslation,
        nrotation,
        nscale
      )
    } else if (matrix) {
      node.transform = MatrixTransform.deserialize(matrix)
    } else {
      node.transform = new TRSTransform()
    }

    if (children instanceof Array) {
      node.children = children.filter(c => typeof c === "number")
    } else {
      node.children = []
    }

    if (typeof name === 'string') {
      node.name = name
    } else {
      node.name = ""
    }
    if (extensions instanceof Object) {
      node.extensions = extensions
    } else {
      node.extensions = {}
    }
    if (extras instanceof Object) {
      node.extras = extras
    } else {
      node.extras = {}
    }
    return node
  }
}

class GLTFMesh {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = {}

  /**
   * @type {GLTFPrimitive[]}
   */
  primitives = []
  /**
   * @type {number[]}
   */
  weights = []
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { primitives, weights, name, extensions, extras } = data
    const mesh = new GLTFMesh()

    if (primitives instanceof Array) {
      mesh.primitives = primitives.map((p) => GLTFPrimitive.deserialize(p))
    } else {
      mesh.primitives = []
    }

    if (weights instanceof Array) {
      mesh.weights = weights.filter(weight => typeof weight === "number")
    } else {
      mesh.weights = []
    }

    if (typeof name === "string") {
      mesh.name = name
    } else {
      mesh.name = ''
    }
    if (extensions instanceof Object) {
      mesh.extensions = extensions
    } else {
      mesh.extensions = {}
    }
    if (extras instanceof Object) {
      mesh.extras = extras
    } else {
      mesh.extras = {}
    }
    return mesh
  }
}

class GLTFMaterial {
  /**
 * @type {string}
 */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = {}

  /**
   * @type {GLTFPBRetallicRoughness}
   */
  pbrMetallicRoughness

  /**
   * @type {GLFTTextureInfo | undefined}
   */
  normalTexture

  /**
   * @type {GLFTTextureInfo | undefined}
   */
  occlusionTexture

  /**
   * @type {GLFTTextureInfo | undefined}
   */
  emissiveTexture

  /**
   * @type {[number, number, number]}
   */
  emissiveFactor = [0, 0, 0]

  /**
   * @type {GLFTAlphaMode}
   */
  alphaMode = GLFTAlphaMode.Opaque

  /**
   * @type {number}
   */
  alphaCutoff = 0.5

  /**
   * @type {boolean}
   */
  doubleSided = false

  /**
   * @param {GLTFPBRetallicRoughness} metallicRoughness
   */
  constructor(metallicRoughness) {
    this.pbrMetallicRoughness = metallicRoughness
  }
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      pbrMetallicRoughness,
      normalTexture,
      occlusionTexture,
      emissiveTexture,
      emissiveFactor,
      alphaMode,
      alphaCutoff,
      doubleSided,
      name,
      extensions,
      extras
    } = data
    const pbr = pbrMetallicRoughness ? GLTFPBRetallicRoughness.deserialize(pbrMetallicRoughness) : new GLTFPBRetallicRoughness()
    const result = new GLTFMaterial(pbr)

    if (normalTexture instanceof Object) {
      result.normalTexture = GLFTTextureInfo.deserialize(normalTexture)
    }

    if (occlusionTexture instanceof Object) {
      result.occlusionTexture = GLFTTextureInfo.deserialize(occlusionTexture)
    }

    if (emissiveTexture instanceof Object) {
      result.emissiveTexture = GLFTTextureInfo.deserialize(emissiveTexture)
    }

    if (emissiveFactor instanceof Array && emissiveFactor.length === 3) {
      result.emissiveFactor = /**@type {[number, number, number]}*/(emissiveFactor)
    }

    if (typeof alphaCutoff === 'number') {
      result.alphaCutoff = alphaCutoff
    }

    if (typeof alphaMode === 'string') {
      result.alphaMode = alphaMode
    }

    if (typeof doubleSided === 'boolean') {
      result.doubleSided = doubleSided
    }

    if (typeof name === "string") {
      result.name = name
    } else {
      result.name = ''
    }

    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }

    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }
    return result
  }
}

class GLTFCamera {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = {}
  /**
   * @type {GLTFCameraProjection | undefined}
   */
  projection

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { type: cameraType, perspective, orthographic, name, extensions, extras } = data
    const camera = new GLTFCamera()

    if (typeof cameraType !== "string") {
      throw "Invalid glTF camera"
    }

    if (cameraType === "perspective") {
      if (!(perspective instanceof Object)) {
        throw "Invalid glTF perspective camera"
      }
      camera.projection = GLTFPerspectiveProjection.deserialize(perspective)
    } else if (cameraType === "orthographic") {
      if (!(orthographic instanceof Object)) {
        throw "Invalid glTF orthographic camera"
      }
      camera.projection = GLTFOrthographicProjection.deserialize(orthographic)
    } else {
      throw `Unsupported glTF camera type: ${cameraType}`
    }

    if (typeof name === "string") {
      camera.name = name
    }

    if (extensions instanceof Object) {
      camera.extensions = extensions
    } else {
      camera.extensions = {}
    }

    if (extras instanceof Object) {
      camera.extras = extras
    } else {
      camera.extras = {}
    }

    return camera
  }
}

class GLTFPerspectiveProjection {
  /**
   * @type {number | undefined}
   */
  aspectRatio
  /**
   * @type {number}
   */
  yfov = 0
  /**
   * @type {number | undefined}
   */
  zfar
  /**
   * @type {number}
   */
  znear = 0

  /**
   * @param {number} yfov
   * @param {number} znear
   */
  constructor(yfov, znear) {
    this.yfov = yfov
    this.znear = znear
  }

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { aspectRatio, yfov, zfar, znear } = data

    if (!(Number.isFinite(yfov) && yfov > 0)) {
      throw "Invalid glTF perspective camera field of view"
    }

    if (!(Number.isFinite(znear) && znear > 0)) {
      throw "Invalid glTF perspective camera near plane"
    }

    const camera = new GLTFPerspectiveProjection(yfov, znear)

    if (aspectRatio !== undefined) {
      if (!(Number.isFinite(aspectRatio) && aspectRatio > 0)) {
        throw "Invalid glTF perspective camera aspect ratio"
      }
      camera.aspectRatio = aspectRatio
    }

    if (zfar !== undefined) {
      if (!(Number.isFinite(zfar) && zfar > 0)) {
        throw "Invalid glTF perspective camera far plane"
      }
      camera.zfar = zfar
    }

    return camera
  }
}

class GLTFOrthographicProjection {
  /**
   * @type {number}
   */
  xmag = 0
  /**
   * @type {number}
   */
  ymag = 0
  /**
   * @type {number}
   */
  zfar = 0
  /**
   * @type {number}
   */
  znear = 0

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { xmag, ymag, zfar, znear } = data

    if (!(Number.isFinite(xmag) && xmag > 0)) {
      throw "Invalid glTF orthographic camera xmag"
    }

    if (!(Number.isFinite(ymag) && ymag > 0)) {
      throw "Invalid glTF orthographic camera ymag"
    }

    if (!(Number.isFinite(znear) && znear >= 0)) {
      throw "Invalid glTF orthographic camera near plane"
    }

    if (!(Number.isFinite(zfar) && zfar > znear)) {
      throw "Invalid glTF orthographic camera far plane"
    }

    const camera = new GLTFOrthographicProjection()
    camera.xmag = xmag
    camera.ymag = ymag
    camera.znear = znear
    camera.zfar = zfar

    return camera
  }
}

/**
 * @typedef {GLTFPerspectiveProjection | GLTFOrthographicProjection} GLTFCameraProjection
 */

class GLTFImage {
  /**
   * @type {string | undefined}
   */
  uri

  /**
   * @type {number | undefined}
   */
  bufferView

  /**
   * @type {string | undefined}
   */
  mimeType


  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { uri, bufferView, mimeType, name, extensions, extras } = data
    const result = new GLTFImage()

    if (typeof uri === 'string') {
      result.uri = uri
    }

    if (typeof bufferView === 'number') {
      result.bufferView = bufferView
    }
    if (typeof mimeType === 'string') {
      result.mimeType = mimeType
    }
    if (typeof name === 'string') {
      result.name = name
    }
    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }
    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }

    return result
  }
}

class GLFTSampler {
  /**
   * @type {number | undefined}
   */
  magFilter
  /**
   * @type {number | undefined}
   */
  minFilter
  /**
   * @type {number | undefined}
   */
  wrapS
  /**
   * @type {number | undefined}
   */
  wrapT
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { magFilter, minFilter, wrapS, wrapT, name, extensions, extras } = data
    const result = new GLFTSampler()

    if (typeof magFilter === 'number') {
      result.magFilter = magFilter
    }

    if (typeof minFilter === 'number') {
      result.minFilter = minFilter
    }

    if (typeof wrapS === 'number') {
      result.wrapS = wrapS
    }

    if (typeof wrapT === 'number') {
      result.wrapT = wrapT
    }

    if (typeof name === 'string') {
      result.name = name
    }

    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }
    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }

    return result
  }
}

class GLFTTexture {
  /**
   * @type {number | undefined}
   */
  sampler

  /**
   * @type {number}
   */
  source

  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []

  /**
   * @param {number} source
   */
  constructor(source) {
    this.source = source
  }
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { source, sampler, name, extensions, extras } = data

    if (typeof source !== 'number') {
      throw 'No source for the texture.'
    }

    const result = new GLFTTexture(source)

    if (typeof sampler === 'number') {
      result.sampler = sampler
    }

    if (typeof name === 'string') {
      result.name = name
    }

    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }

    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }

    return result
  }
}

class GLTFSkin {
  /**
   * @type {number | undefined}
   */
  inverseBindMatrices

  /**
   * @type {number | undefined}
   */
  skeleton
  /**
   * @type {number[]}
   */
  joints

  /**
   * @param {number[]} joints
   * @param {number} inverseBindMatrices
   */
  constructor(joints, inverseBindMatrices) {
    this.inverseBindMatrices = inverseBindMatrices
    this.joints = joints
  }

  /**

   * @param {any} data 
   */
  static deserialize(data) {
    const { joints, inverseBindMatrices, skeleton } = data

    if (!(joints instanceof Array)) {
      throw 'Invalid skin'
    }
    if (
      inverseBindMatrices !== undefined &&
      typeof inverseBindMatrices !== 'number'
    ) {
      throw 'Invalid skin'
    }
    const object = new GLTFSkin(
      joints.filter(e => typeof e === 'number'),
      inverseBindMatrices
    )

    if (typeof skeleton === 'number') {
      object.skeleton = skeleton
    }
    return object
  }
}

class GLTFBufferView {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = []
  /**
   * @type {number}
   */
  buffer
  /**
   * @type {number}
   */
  offset = 0
  /**
   * @type {number}
   */
  length
  /**
   * @type {number}
   */
  stride = 0
  /**
   * @type {number | undefined}
   */
  target

  /**
   * @param {number} buffer
   * @param {number} length
   */
  constructor(buffer, length) {
    this.buffer = buffer
    this.length = length
  }

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      buffer,
      byteOffset,
      byteLength,
      target,
      byteStride,
      name,
      extensions,
      extras
    } = data

    if (
      typeof buffer !== "number" ||
      typeof byteLength !== "number"
    ) {
      throw "Invalid buffer view provided"
    }

    const struct = new GLTFBufferView(buffer, byteLength)

    if (typeof byteOffset === "number") {
      struct.offset = byteOffset
    } else {
      struct.offset = 0
    }

    if (typeof byteStride === "number") {
      struct.stride = byteStride
    } else {
      struct.stride = 0
    }

    if (typeof target === "number") {
      struct.target = target
    }

    if (typeof name === 'string') {
      struct.name = name
    } else {
      struct.name = ""
    }
    if (extensions instanceof Object) {
      struct.extensions = extensions
    } else {
      struct.extensions = {}
    }
    if (extras instanceof Object) {
      struct.extras = extras
    } else {
      struct.extras = {}
    }
    return struct
  }
}

class GLTFAccessor {
  /**
   * @type {string}
   */
  name = ''
  /**
   * @type {Record<string,any>}
   */
  extensions = {}
  /**
   * @type {Record<string,any>}
   */
  extras = {}
  /**
   * @type {boolean}
   */
  normalized = false
  /**
   * @type {number}
   */
  view = 0
  /**
   * @type {number}
   */
  offset = 0
  /**
   * @type {GLTFComponentType}
   */
  componentType
  /**
   * @type {number}
   */
  count
  /**
   * @type {GLTFAccessorType}
   */
  type
  /**
   * @type {number[] | undefined}
   */
  max
  /**
   * @type {number[] | undefined}
   */
  min

  /**
   * @param {number} type
   * @param {number} componentType
   * @param {number} count
   */
  constructor(type, componentType, count) {
    this.type = type
    this.componentType = componentType
    this.count = count
  }
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      bufferView,
      byteOffset,
      componentType,
      count,
      type,
      max,
      min,
      normalized,
      sparse,
      name,
      extensions,
      extras
    } = data

    if (
      typeof componentType !== "number" ||
      typeof type !== "string" ||
      typeof count !== "number"
    ) {
      throw "Invalid accessor"
    }
    const struct = new GLTFAccessor(
      mapAccessorType(type),
      mapComponentType(componentType),
      count
    )

    if (typeof bufferView === "number") {
      struct.view = bufferView
    } else {
      if (sparse instanceof Object) {
        throw "Sparse accessors are not yet supported"
      } else {
        throw "No buffer view to index into for accessor"
      }
    }

    if (typeof byteOffset === "number") {
      struct.offset = byteOffset
    } else {
      struct.offset = 0
    }

    if (typeof normalized === "boolean") {
      struct.normalized = normalized
    } else {
      struct.normalized = false
    }

    if (max instanceof Array) {
      struct.max = max
    }

    if (min instanceof Array) {
      struct.min = min
    }

    if (typeof name === 'string') {
      struct.name = name
    } else {
      struct.name = ""
    }
    if (extensions instanceof Object) {
      struct.extensions = extensions
    } else {
      struct.extensions = {}
    }
    if (extras instanceof Object) {
      struct.extras = extras
    } else {
      struct.extras = {}
    }
    return struct
  }
}

class GLTFMetaData {
  /**
   * @type {string}
   */
  version
  /**
   * @type {string | undefined}
   */
  generator

  /**
   * @param {string} version
   */
  constructor(version) {
    this.version = version
  }
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { version, generator } = data

    if (typeof version !== "string") {
      throw "GLTF asset version is required"
    }

    const meta = new GLTFMetaData(version)
    if (typeof generator === "string") {
      meta.generator = generator
    }
    return meta
  }
}

class GLTFPrimitive {
  /**
   * @type {Map<GLTFAttributeName,number>}
   */
  attributes = new Map()
  /**
   * @type {number | undefined}
   */
  indices
  /**
   * @type {number | undefined}
   */
  material
  /**
   * @type {GLTFPrimitiveMode}
   */
  mode = GLTFPrimitiveMode.Triangles
  /**
   * @param {any} data
   */
  static deserialize(data) {
    const { attributes, material, indices, mode } = data
    const primitive = new GLTFPrimitive()

    if (typeof indices === "number") {
      primitive.indices = indices
    }

    if (typeof material === "number") {
      primitive.material = material
    }

    if (attributes instanceof Object) {
      for (const key in attributes) {
        const value = attributes[key]
        if (typeof value === "number") {
          primitive.attributes.set(key, value)
        }
      }
    }
    if (typeof mode === "number") {
      primitive.mode = mapPrimitiveMode(mode)
    } else {
      primitive.mode = GLTFPrimitiveMode.Triangles
    }
    return primitive
  }
}

class GLTFPBRetallicRoughness {
  /**
   * @type {Record<string,any>}
   */
  extensions = {}

  /**
   * @type {Record<string,any>}
   */
  extras = {}

  /**
   * @type {[number, number, number, number]}
   */
  baseColorFactor = [1, 1, 1, 1]

  /**
   * @type { GLFTTextureInfo | undefined }
   */
  baseColorTexture

  /**
   * @type {number}
   */
  metallicFactor = 1

  /**
   * @type {number}
   */
  roughnessFactor = 1

  /**
   * @type {GLFTTextureInfo | undefined}
   */
  metallicRoughnessTexture

  /**
   * @param {any} data
   */
  static deserialize(data) {
    const {
      baseColorFactor,
      baseColorTexture,
      metallicFactor,
      roughnessFactor,
      metallicRoughnessTexture,
      extensions,
      extras
    } = data

    const result = new GLTFPBRetallicRoughness()

    if (typeof metallicFactor === 'number') {
      result.metallicFactor = metallicFactor
    }

    if (typeof roughnessFactor === 'number') {
      result.roughnessFactor = roughnessFactor
    }

    if (baseColorFactor instanceof Array && baseColorFactor.length === 4) [
      result.baseColorFactor = /**@type {[number,number,number,number]}*/(baseColorFactor)
    ]

    if (baseColorTexture) {
      result.baseColorTexture = GLFTTextureInfo.deserialize(baseColorTexture)
    }

    if (metallicRoughnessTexture) {
      result.metallicRoughnessTexture = GLFTTextureInfo.deserialize(metallicRoughnessTexture)
    }

    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }
    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }

    return result
  }
}

class GLFTTextureInfo {
  /**
   * @type {number}
   */
  index

  /**
   * @type {number}
   */
  texCoord = 0

  /**
   * @type {number}
   */
  scale = 1

  /**
   * @type {number}
   */
  strength = 1

  /**
   * @type {Record<string, any>}
   */
  extensions = {}

  /**
   * @type {Record<string, any>}
   */
  extras = {}

  /**
   * @param {number} index
   */
  constructor(index) {
    this.index = index
  }
  /**
 * @param {any} data
 */
  static deserialize(data) {
    const { index, texCoord, scale, strength, extensions, extras } = data

    if (typeof index !== 'number') {
      throw 'Texture info index is not type of number'
    }
    const result = new GLFTTextureInfo(index)

    if (typeof texCoord === 'number') [
      result.texCoord = texCoord
    ]

    if (typeof scale === 'number') [
      result.scale = scale
    ]

    if (typeof strength === 'number') [
      result.strength = strength
    ]

    if (extensions instanceof Object) {
      result.extensions = extensions
    } else {
      result.extensions = {}
    }
    if (extras instanceof Object) {
      result.extras = extras
    } else {
      result.extras = {}
    }

    return result
  }
}

/**
 * Enum of GLTF's semantic mesh attribute names.
 * @enum {string}
 */
export const GLTFAttributeName = /**@type {const}*/({
  /** Vertex positions */
  Position: "POSITION",
  /** Vertex normals */
  Normal: "NORMAL",
  /** Vertex tangents */
  Tangent: "TANGENT",
  /** Vertex texture coordinates set 0 */
  TexCoord0: "TEXCOORD_0",
  /** Vertex texture coordinates set 1 */
  TexCoord1: "TEXCOORD_1",
  /** Vertex colors set 0 */
  Color0: "COLOR_0",
  /** Joint indices for skinning set 0 */
  Joints0: "JOINTS_0",
  /** Joint weights for skinning set 0 */
  Weights0: "WEIGHTS_0"
})

/**
 * @enum {number}
 */
export const GLTFComponentType = /**@type {const}*/({
  Byte: 0x1400,
  UnsignedByte: 0x1401,
  Short: 0x1402,
  UnsignedShort: 0x1403,
  Int: 0x1404,
  UnsignedInt: 0x1405,
  Float: 0x1406
})

/**
 * @enum {number}
 */
export const GLTFAccessorType = /**@type {const}*/({
  Scalar: 0,
  Vec2: 1,
  Vec3: 2,
  Vec4: 3,
  Mat2: 4,
  Mat3: 5,
  Mat4: 6
})

/**
 * @enum {number}
 */
export const GLTFPrimitiveMode = /**@type {const}*/({
  Points: 0,
  Lines: 1,
  LineLoop: 2,
  LineStrip: 3,
  Triangles: 4,
  TriangleStrip: 5,
  TriangleFan: 6
})

/**
 * @enum {string}
 */
export const GLFTAlphaMode = /**@type {const}*/({
  Opaque: "OPAQUE",
  Mask: "MASK",
  Blend: "BLEND"
})

/**
 * Maps a raw glTF accessor type string to a valid AccessorType enum value.
 * @param {string} typeString - Raw type from the glTF JSON (e.g. "VEC3", "MAT4").
 * @returns {GLTFAccessorType} One of the AccessorType values.
 * @throws {Error} If the type is not recognized.
 */
function mapAccessorType(typeString) {
  switch (typeString.toUpperCase()) {
    case "SCALAR": return GLTFAccessorType.Scalar;
    case "VEC2": return GLTFAccessorType.Vec2;
    case "VEC3": return GLTFAccessorType.Vec3;
    case "VEC4": return GLTFAccessorType.Vec4;
    case "MAT2": return GLTFAccessorType.Mat2;
    case "MAT3": return GLTFAccessorType.Mat3;
    case "MAT4": return GLTFAccessorType.Mat4;
    default:
      throw new Error(`Unknown accessor type: ${typeString}`);
  }
}

/**
 * Maps a raw glTF accessor component type string to a valid AccessorComponentType enum value.
 * @param {number} value - Raw type from the glTF JSON (e.g. "VEC3", "MAT4").
 * @returns {GLTFAccessorType} One of the AccessorType values.
 * @throws {Error} If the component type is not recognized.
 */
function mapComponentType(value) {
  switch (value) {
    case 0x1400: return GLTFComponentType.Byte;
    case 0x1401: return GLTFComponentType.UnsignedByte;
    case 0x1402: return GLTFComponentType.Short;
    case 0x1403: return GLTFComponentType.UnsignedShort;
    case 0x1404: return GLTFComponentType.Int;
    case 0x1405: return GLTFComponentType.UnsignedInt;
    case 0x1406: return GLTFComponentType.Float;
    default:
      throw new Error(`Unknown accessor component type: ${value}`);
  }
}

/**
 * @param {number} mode
 */
export function mapPrimitiveMode(mode) {
  switch (mode) {
    case 0: return GLTFPrimitiveMode.Points;
    case 1: return GLTFPrimitiveMode.Lines;
    case 2: return GLTFPrimitiveMode.LineLoop;
    case 3: return GLTFPrimitiveMode.LineStrip;
    case 4: return GLTFPrimitiveMode.Triangles;
    case 5: return GLTFPrimitiveMode.TriangleStrip;
    case 6: return GLTFPrimitiveMode.TriangleFan;
    default: throw "Unrecognized primitive mode: " + mode
  }
}

class TRSTransform {
  /**
   * @type {[number,number,number]}
   */
  translation
  /**
   * @type {[number,number,number,number]}
   */
  rotation
  /**
   * @type {[number,number,number]}
   */
  scale
  /**
   * @param {[number, number, number]} [translation]
   * @param {[number, number, number, number]} [rotation]
   * @param {[number, number, number]} [scale]
   */
  constructor(
    translation = [0, 0, 0],
    rotation = [0, 0, 0, 1],
    scale = [1, 1, 1]
  ) {
    this.translation = translation
    this.rotation = rotation
    this.scale = scale
  }
  /**
   * @param {any} translation
   * @param {any} rotation
   * @param {any} scale
   */
  static deserialize(translation, rotation, scale) {
    const transform = new TRSTransform()

    if (
      !(translation instanceof Array) ||
      !(rotation instanceof Array) ||
      !(scale instanceof Array)
    ) {
      throw "Invalid transform"
    }

    //@ts-ignore
    transform.translation = translation.filter((data) => typeof data === "number")
    //@ts-ignore
    transform.rotation = rotation.filter((data) => typeof data === "number")
    //@ts-ignore
    transform.scale = scale.filter((data) => typeof data === "number")
    return transform
  }
}

class MatrixTransform {
  /**
   * @type {Affine3}
   */
  value

  /**
   * @param {Affine3} value
   */
  constructor(value) {
    this.value = value
  }
  /**
 * @param {any} data
 */
  static deserialize(data) {

    if (
      !(data instanceof Array)
    ) {
      throw "Invalid transform"
    }
    const t = data.filter((data) => typeof data === "number")

    if (t.length !== 16) {
      throw "invalid matrix transform"
    }
    const transform = new MatrixTransform(new Affine3(
      t[0], t[4], t[8], t[12],
      t[1], t[5], t[9], t[13],
      t[2], t[6], t[10], t[14]
    ))

    return transform
  }
}

/**
 * 
 * @param {number} index 
 * @param {GLTF} gltf
 * @returns {[DataView,GLTFAccessor]}
 */
function getAccessorData(index, gltf) {
  const { accessors, bufferViews, buffers } = gltf
  const accessor = accessors[index]
  if (!accessor) throw "Invalid access to accessors"

  const view = bufferViews[accessor.view]

  if (!view) throw "Invalid access to buffer views"

  const buffer = buffers[view.buffer]

  if (!buffer) throw "Invalid access to buffer"

  const componentSize = getComponentSize(accessor.componentType)
  const elementSize = getElementSize(accessor.type)
  const elementByteLength = componentSize * elementSize
  const stride = view.stride || elementByteLength

  if (stride < elementByteLength) {
    throw "Invalid accessor stride"
  }

  if (stride === elementByteLength) {
    const byteLength = accessor.count * elementByteLength
    return [
      new DataView(buffer, view.offset + accessor.offset, byteLength),
      accessor
    ]
  }

  const packedBuffer = new ArrayBuffer(accessor.count * elementByteLength)
  const destination = new Uint8Array(packedBuffer)
  const sourceOffset = view.offset + accessor.offset

  for (let i = 0; i < accessor.count; i++) {
    const sourceStart = sourceOffset + i * stride
    destination.set(
      new Uint8Array(buffer, sourceStart, elementByteLength),
      i * elementByteLength
    )
  }

  return [
    new DataView(packedBuffer),
    accessor
  ]
}

/**
 * @param {GLTFAccessor} accessor
 * @param {DataView} view
 */
function mapToIndices(accessor, view) {
  if (accessor.type !== GLTFAccessorType.Scalar) {
    throw "Indices provided on a mesh is not valid"
  }

  switch (accessor.componentType) {
    case GLTFComponentType.UnsignedByte:
      return Uint16Array.from(
        new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      )
    case GLTFComponentType.UnsignedShort:
      return new Uint16Array(
        view.buffer,
        view.byteOffset,
        view.byteLength / Uint16Array.BYTES_PER_ELEMENT
      )
    case GLTFComponentType.UnsignedInt:
      return new Uint32Array(
        view.buffer,
        view.byteOffset,
        view.byteLength / Uint32Array.BYTES_PER_ELEMENT
      )
    default:
      throw "Indices provided on a mesh is not valid"
  }
}

/**
 * @param {GLTFComponentType} componentType
 */
function isFloatComponentType(componentType) {
  return componentType === GLTFComponentType.Float
}

/**
 * @param {GLTFComponentType} componentType
 */
function isNormalizedIntegerComponentType(componentType) {
  switch (componentType) {
    case GLTFComponentType.Byte:
    case GLTFComponentType.UnsignedByte:
    case GLTFComponentType.Short:
    case GLTFComponentType.UnsignedShort:
      return true
    default:
      return false
  }
}

/**
 * @param {GLTFComponentType} componentType
 */
function isJointComponentType(componentType) {
  switch (componentType) {
    case GLTFComponentType.UnsignedByte:
    case GLTFComponentType.UnsignedShort:
      return true
    default:
      return false
  }
}

/**
 * @param {DataView} view
 * @param {number} offset
 * @param {GLTFComponentType} componentType
 * @param {boolean} normalized
 * @returns {number}
 */
function readAccessorComponent(view, offset, componentType, normalized) {
  switch (componentType) {
    case GLTFComponentType.Byte: {
      const value = view.getInt8(offset)
      if (!normalized) return value
      return Math.max(value / 127, -1)
    }
    case GLTFComponentType.UnsignedByte: {
      const value = view.getUint8(offset)
      if (!normalized) return value
      return value / 255
    }
    case GLTFComponentType.Short: {
      const value = view.getInt16(offset, true)
      if (!normalized) return value
      return Math.max(value / 32767, -1)
    }
    case GLTFComponentType.UnsignedShort: {
      const value = view.getUint16(offset, true)
      if (!normalized) return value
      return value / 65535
    }
    case GLTFComponentType.Int: {
      const value = view.getInt32(offset, true)
      if (!normalized) return value
      return Math.max(value / 2147483647, -1)
    }
    case GLTFComponentType.UnsignedInt: {
      const value = view.getUint32(offset, true)
      if (!normalized) return value
      return value / 4294967295
    }
    case GLTFComponentType.Float:
      return view.getFloat32(offset, true)
    default:
      throw "Unsupported accessor component type"
  }
}

/**
 * @param {GLTFAccessor} accessor
 * @param {DataView} buffer
 * @param {number} componentCount
 * @param {boolean} [allowVec3Padding=false]
 * @returns {DataView}
 */
function convertAccessorToFloat32(accessor, buffer, componentCount, allowVec3Padding = false) {
  const sourceComponents = getElementSize(accessor.type)
  if (sourceComponents !== componentCount) {
    if (!(allowVec3Padding && componentCount === 4 && sourceComponents === 3)) {
      throw "Attribute types do not match"
    }
  }

  const componentSize = getComponentSize(accessor.componentType)
  const normalized = accessor.normalized
  const result = new Float32Array(accessor.count * componentCount)

  for (let i = 0; i < accessor.count; i++) {
    const sourceOffset = i * sourceComponents * componentSize
    const resultOffset = i * componentCount

    for (let component = 0; component < sourceComponents; component++) {
      result[resultOffset + component] = readAccessorComponent(
        buffer,
        sourceOffset + component * componentSize,
        accessor.componentType,
        normalized
      )
    }

    if (allowVec3Padding && componentCount === 4 && sourceComponents === 3) {
      result[resultOffset + 3] = 1.0
    }
  }

  return new DataView(result.buffer)
}

/**
 * @param {GLTFAccessor} accessor
 * @param {DataView} buffer
 * @returns {DataView}
 */
function convertAccessorToUint16(accessor, buffer) {
  const sourceComponents = getElementSize(accessor.type)
  if (sourceComponents !== 4) {
    throw "Attribute types do not match"
  }

  const componentType = accessor.componentType
  if (!isJointComponentType(componentType) || accessor.normalized) {
    throw "Attribute types do not match"
  }

  const componentSize = getComponentSize(componentType)
  const result = new Uint16Array(accessor.count * sourceComponents)

  for (let i = 0; i < accessor.count; i++) {
    const sourceOffset = i * sourceComponents * componentSize
    const resultOffset = i * sourceComponents

    for (let component = 0; component < sourceComponents; component++) {
      result[resultOffset + component] = readAccessorComponent(
        buffer,
        sourceOffset + component * componentSize,
        componentType,
        false
      )
    }
  }

  return new DataView(result.buffer)
}

/**
 * @param {string} name
 * @param {GLTFAccessor} accessor
 * @param {DataView} buffer
 * @returns {[string, DataView] | undefined}
 */
function mapAccessorTypeToAttribute(name, accessor, buffer) {
  switch (name) {
    case GLTFAttributeName.Position:
      if (accessor.type !== GLTFAccessorType.Vec3 || accessor.componentType !== GLTFComponentType.Float || accessor.normalized)
        throw "Attribute types do not match"
      return [Attribute.Position.name, convertAccessorToFloat32(accessor, buffer, 3)]
    case GLTFAttributeName.TexCoord0:
      if (
        accessor.type !== GLTFAccessorType.Vec2 ||
        (!isFloatComponentType(accessor.componentType) && !isNormalizedIntegerComponentType(accessor.componentType)) ||
        (accessor.componentType === GLTFComponentType.Float ? accessor.normalized : !accessor.normalized)
      )
        throw "Attribute types do not match"
      return [Attribute.UV.name, convertAccessorToFloat32(accessor, buffer, 2)]
    case GLTFAttributeName.TexCoord1:
      if (
        accessor.type !== GLTFAccessorType.Vec2 ||
        (!isFloatComponentType(accessor.componentType) && !isNormalizedIntegerComponentType(accessor.componentType)) ||
        (accessor.componentType === GLTFComponentType.Float ? accessor.normalized : !accessor.normalized)
      )
        throw "Attribute types do not match"
      return [Attribute.UVB.name, convertAccessorToFloat32(accessor, buffer, 2)]
    case GLTFAttributeName.Normal:
      if (accessor.type !== GLTFAccessorType.Vec3 || accessor.componentType !== GLTFComponentType.Float || accessor.normalized)
        throw "Attribute types do not match"
      return [Attribute.Normal.name, convertAccessorToFloat32(accessor, buffer, 3)]
    case GLTFAttributeName.Tangent:
      if (accessor.type !== GLTFAccessorType.Vec4 || accessor.componentType !== GLTFComponentType.Float || accessor.normalized)
        throw "Attribute types do not match"
      return [Attribute.Tangent.name, convertAccessorToFloat32(accessor, buffer, 4)]
    case GLTFAttributeName.Color0:
      if (
        (accessor.type !== GLTFAccessorType.Vec3 && accessor.type !== GLTFAccessorType.Vec4) ||
        (!isFloatComponentType(accessor.componentType) && !isNormalizedIntegerComponentType(accessor.componentType)) ||
        (accessor.componentType === GLTFComponentType.Float ? accessor.normalized : !accessor.normalized)
      )
        throw "Attribute types do not match"
      return [Attribute.Color.name, convertAccessorToFloat32(accessor, buffer, 4, accessor.type === GLTFAccessorType.Vec3)]
    case GLTFAttributeName.Weights0:
      if (
        accessor.type !== GLTFAccessorType.Vec4 ||
        (!isFloatComponentType(accessor.componentType) && !isNormalizedIntegerComponentType(accessor.componentType)) ||
        (accessor.componentType === GLTFComponentType.Float ? accessor.normalized : !accessor.normalized)
      )
        throw "Attribute types do not match"
      return [Attribute.JointWeight.name, convertAccessorToFloat32(accessor, buffer, 4)]
    case GLTFAttributeName.Joints0:
      if (accessor.type !== GLTFAccessorType.Vec4 || accessor.normalized || !isJointComponentType(accessor.componentType)) {
        throw "Attribute types do not match"
      }
      return [Attribute.JointIndex.name, convertAccessorToUint16(accessor, buffer)]
    default:
      return undefined;
  }
}


/**
 * @param {GLTFComponentType} componentType
 */
function getComponentSize(componentType) {
  switch (componentType) {
    case GLTFComponentType.Byte:           // 0x1400
      return 1;
    case GLTFComponentType.UnsignedByte:   // 0x1401
      return 1;
    case GLTFComponentType.Short:          // 0x1402
      return 2;
    case GLTFComponentType.UnsignedShort:  // 0x1403
      return 2;
    case GLTFComponentType.Int:            // 0x1404
      return 4;
    case GLTFComponentType.UnsignedInt:    // 0x1405
      return 4;
    case GLTFComponentType.Float:          // 0x1406
      return 4;
    default:
      return 0; // Return 0 if componentType is unknown
  }
}


/**
 * @param {GLTFAccessorType} type
 */
function getElementSize(type) {
  switch (type) {
    case GLTFAccessorType.Scalar:
      return 1;
    case GLTFAccessorType.Vec2:
      return 2;
    case GLTFAccessorType.Vec3:
      return 3;
    case GLTFAccessorType.Vec4:
      return 4;
    case GLTFAccessorType.Mat2:
      return 4;
    case GLTFAccessorType.Mat3:
      return 9;
    case GLTFAccessorType.Mat4:
      return 16;
    default:
      return 0;;
  }
}

/**
 * @param {number} mesh
 * @param {GLTFMesh[]} meshes
 * @param {[Mesh,number | undefined][][]} geometries
 * @param {StandardMaterial[]} materials
 */
function parseMeshObject(mesh, meshes, geometries, materials) {
  const meshData = meshes[mesh]
  const geometry = geometries[mesh]

  if (!meshData || !geometry) {
    throw "Invalid mesh index on node"
  }
  if (geometry.length === 1) {
    const item = /**@type {[Mesh,number | undefined]}*/(geometry[0])
    const material = item[1] !== undefined ? materials[item[1]] : defaultMaterial

    return new MeshMaterial3D(item[0], material || defaultMaterial)
  }
  const root = new Object3D()
  for (let i = 0; i < geometry.length; i++) {
    const item = /**@type {[Mesh,number | undefined]}*/(geometry[i])
    const material = item[1] !== undefined ? materials[item[1]] : defaultMaterial
    const object = new MeshMaterial3D(item[0], material || defaultMaterial)

    root.add(object)
  }

  return root
}

/**
 * @param {GLTFMesh} gltfMesh
 * @param {GLTF} gltf
 * @returns {[Mesh, number | undefined][]}
 */
function parseGeometry(gltfMesh, gltf) {
  /**@type {[Mesh, number | undefined][]}*/
  const results = []
  for (let i = 0; i < gltfMesh.primitives.length; i++) {
    const primitive = /**@type {GLTFPrimitive} */ (gltfMesh.primitives[i])
    const attributes = new SeparateAttributeData()
    const mesh = new Mesh(attributes)
    mesh.topology = primitive.mode
    if (primitive.indices !== undefined) {
      const [dataView, accessor] = getAccessorData(
        primitive.indices,
        gltf
      )
      mesh.indices = mapToIndices(accessor, dataView)
    }
    for (const [name, location] of primitive.attributes) {
      const [buffer, accessor] = getAccessorData(
        location,
        gltf
      )
      const attribute = mapAccessorTypeToAttribute(name, accessor, buffer)
      if (!attribute) continue
      const [attributeName, attributeBuffer] = attribute
      attributes.set(
        attributeName,
        attributeBuffer
      )
    }

    mesh.normalizeJointWeights()
    results.push([mesh, primitive.material])
  }
  return results
}

/**
 * @param {GLTFSkin} gltfSkin
 * @param {GLTF} gltf
 * @param {Map<number, Object3D>} entityMap
 * @returns {Skin}
 */
function parseSkin(gltfSkin, gltf, entityMap) {
  /** @type {Affine3[]} */
  let bindPose = []

  if (gltfSkin.inverseBindMatrices !== undefined) {
    const bindPoseAccessor = gltf.accessors[gltfSkin.inverseBindMatrices]
    if (
      !bindPoseAccessor ||
      bindPoseAccessor.type !== GLTFAccessorType.Mat4 ||
      bindPoseAccessor.componentType !== GLTFComponentType.Float ||
      bindPoseAccessor.normalized
    ) {
      throw "Attribute types do not match"
    }

    const [bindPoseData] = getAccessorData(gltfSkin.inverseBindMatrices, gltf)
    bindPose = convertToInverseBindPose(bindPoseData)
  }

  const skin = new Skin()

  if (gltfSkin.inverseBindMatrices !== undefined && bindPose.length !== gltfSkin.joints.length) {
    console.warn(
      "GLTF skin inverse bind matrix count does not match joint count",
      bindPose.length,
      gltfSkin.joints.length
    )
  }

  skin.inverseBindPose = gltfSkin.joints.map((_, index) => bindPose[index] || new Affine3())
  skin.bones = gltfSkin.joints.map(joint => {
    const entity = entityMap.get(joint)
    if (!(entity instanceof Bone3D)) {
      throw "One of the bones is not a `Bone3D`"
    }

    return entity
  })

  return skin
}

/**
 * 
 * @param {DataView} poseData 
 * @returns {Affine3[]}
 */
function convertToInverseBindPose(poseData) {
  const results = []
  const data = new Float32Array(
    poseData.buffer,
    poseData.byteOffset,
    poseData.byteLength / Float32Array.BYTES_PER_ELEMENT
  )

  for (let offset = 0; offset < data.length; offset += 16) {
    // glTF stores matrices in column-major order. Affine3 expects the same
    // 3x4 affine components, with translation coming from the last column.
    const affine = new Affine3(
      data[offset + 0], data[offset + 4], data[offset + 8], data[offset + 12],
      data[offset + 1], data[offset + 5], data[offset + 9], data[offset + 13],
      data[offset + 2], data[offset + 6], data[offset + 10], data[offset + 14],
    )

    results.push(affine)
  }

  return results
}

/**
 * @param {number} index
 * @param {GLTFNode} node
 * @param {GLTF} gltf
 * @param {[Mesh,number | undefined][][]} geometries
 * @param {StandardMaterial[]} materials
 */
function parseObject(index, node, gltf, geometries, materials) {
  const { mesh, transform, name } = node
  const light = parseGLTFLight(node, gltf)
  const camera = parseGLTFCamera(node, gltf)

  let object
  if (mesh !== undefined) {
    object = parseMeshObject(mesh, gltf.meshes, geometries, materials)
    if (light) {
      object.add(light)
    }
    if (camera) {
      object.add(camera)
    }
  } else {
    const bone = parseBone(index, gltf)

    if (bone) {
      object = bone
      if (light) {
        object.add(light)
      }
      if (camera) {
        object.add(camera)
      }
    } else if (light) {
      object = light
      if (camera) {
        object.add(camera)
      }
    } else if (camera) {
      object = camera
    } else {
      object = new Object3D()
    }
  }

  if (transform) {
    transferTransform(object, transform)
  }

  if (name.length > 0) {
    object.name = name
  }

  return object
}

/**
 * @param {GLTFNode} node
 * @param {GLTF} gltf
 * @returns {Camera | undefined}
 */
function parseGLTFCamera(node, gltf) {
  const cameraIndex = node.camera

  if (typeof cameraIndex !== "number") {
    return undefined
  }

  const gltfCamera = gltf.cameras[cameraIndex]
  if (!(gltfCamera instanceof Object)) {
    throw "GLTF camera node is invalid"
  }

  return createGLTFCamera(gltfCamera)
}

/**
 * @param {GLTFCamera} gltfCamera
 * @returns {Camera}
 */
function createGLTFCamera(gltfCamera) {
  const camera = new Camera()
  camera.name = gltfCamera.name

  const projection = gltfCamera.projection
  assert(projection, "GLTF camera projection definition missing")

  if (projection instanceof GLTFPerspectiveProjection) {
    const perspective = projection
    assert(perspective, "GLTF perspective camera definition missing")

    camera.projection = new PerspectiveProjection(
      perspective.yfov,
      perspective.aspectRatio ?? 1
    )
    camera.near = perspective.znear
    camera.far = perspective.zfar ?? camera.far
    return camera
  }

  if (projection instanceof GLTFOrthographicProjection) {
    const orthographic = projection
    assert(orthographic, "GLTF orthographic camera definition missing")

    camera.projection = new OrthographicProjection(
      -orthographic.xmag,
      orthographic.xmag,
      orthographic.ymag,
      -orthographic.ymag
    )
    camera.near = orthographic.znear
    camera.far = orthographic.zfar
    return camera
  }

  throw "Unsupported glTF camera projection"
}

/**
 * @param {GLTFNode} node
 * @param {GLTF} gltf
 * @returns {DirectionalLight | PointLight | SpotLight | undefined}
 */
function parseGLTFLight(node, gltf) {
  const nodeLightExtension = node.extensions[GLTF_LIGHTS_PUNCTUAL_EXTENSION]

  if (!(nodeLightExtension instanceof Object)) {
    return undefined
  }

  const lightIndex = nodeLightExtension.light
  if (typeof lightIndex !== "number") {
    throw "GLTF light node is missing a light index"
  }

  const extension = gltf.extensions[GLTF_LIGHTS_PUNCTUAL_EXTENSION]
  if (!(extension instanceof Object) || !(extension.lights instanceof Array)) {
    throw "GLTF punctual lights extension is missing its light table"
  }

  const gltfLight = extension.lights[lightIndex]
  if (!(gltfLight instanceof Object)) {
    throw "GLTF light index is invalid"
  }

  return createGLTFLight(gltfLight)
}

/**
 * @param {any} gltfLight
 * @returns {DirectionalLight | PointLight | SpotLight}
 */
function createGLTFLight(gltfLight) {
  const color = Array.isArray(gltfLight.color) ? gltfLight.color : []
  const red = Number.isFinite(color[0]) ? color[0] : 1
  const green = Number.isFinite(color[1]) ? color[1] : 1
  const blue = Number.isFinite(color[2]) ? color[2] : 1
  const intensity = Number.isFinite(gltfLight.intensity) ? gltfLight.intensity : 1
  const name = typeof gltfLight.name === "string" ? gltfLight.name : ""

  if (gltfLight.type === "directional") {
    const light = new DirectionalLight()
    light.color.set(red, green, blue)
    light.intensity = intensity
    light.name = name
    return light
  }

  if (gltfLight.type === "point") {
    const light = new PointLight()
    light.color.set(red, green, blue)
    light.intensity = intensity
    light.radius = Number.isFinite(gltfLight.range) && gltfLight.range > 0
      ? gltfLight.range
      : DEFAULT_GLTF_LIGHT_RANGE
    light.name = name
    return light
  }

  if (gltfLight.type === "spot") {
    const light = new SpotLight()
    const spot = gltfLight.spot instanceof Object ? gltfLight.spot : {}
    const innerConeAngle = Number.isFinite(spot.innerConeAngle) && spot.innerConeAngle >= 0
      ? spot.innerConeAngle
      : 0
    const outerConeAngle = Number.isFinite(spot.outerConeAngle) && spot.outerConeAngle > 0
      ? spot.outerConeAngle
      : Math.PI / 4
    const normalizedInnerConeAngle = Math.min(innerConeAngle, outerConeAngle)
    const normalizedOuterConeAngle = Math.max(innerConeAngle, outerConeAngle)

    light.color.set(red, green, blue)
    light.intensity = intensity
    light.range = Number.isFinite(gltfLight.range) && gltfLight.range > 0
      ? gltfLight.range
      : DEFAULT_GLTF_LIGHT_RANGE
    light.innerAngle = normalizedInnerConeAngle * 2
    light.outerAngle = normalizedOuterConeAngle * 2
    light.name = name
    return light
  }

  throw `Unsupported glTF light type: ${gltfLight.type}`
}

/**
 * @param {number} index
 * @param {GLTF} gltf
 * @returns {Bone3D | undefined}
 */
function parseBone(index, gltf) {
  for (const skin of gltf.skins) {
    const boneIndex = skin.joints.findIndex((v) => v === index)
    if (boneIndex !== -1) {
      const bone = new Bone3D()
      bone.index = boneIndex
      return bone
    }
  }
  return undefined
}

/**
 * @param {Object3D} object
 * @param {TRSTransform | MatrixTransform} transform
 */
function transferTransform(object, transform) {
  if (transform instanceof TRSTransform) {
    object.transform.position.x = transform.translation[0]
    object.transform.position.y = transform.translation[1]
    object.transform.position.z = transform.translation[2]
    object.transform.orientation.x = transform.rotation[0]
    object.transform.orientation.y = transform.rotation[1]
    object.transform.orientation.z = transform.rotation[2]
    object.transform.orientation.w = transform.rotation[3]
    object.transform.scale.x = transform.scale[0]
    object.transform.scale.y = transform.scale[1]
    object.transform.scale.z = transform.scale[2]
  }
  if (transform instanceof MatrixTransform) {
    const [position, rotation, scale] = transform.value.decompose()

    object.transform.position.copy(position)
    object.transform.orientation.copy(rotation)
    object.transform.scale.copy(scale)
  }
}

/**
 * 
 * @param {TypedArray} from 
 * @param {new (...args:any[])=>TypedArray} to 
 * @returns 
 */
/**
 *@typedef {Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array} TypedArray
 */

/**
 * @typedef {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} MatrixArray
 */
