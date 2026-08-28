import { Camera, CameraPrepasses, Object3D } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { Vector3 } from "../../../math/index.js"
import { assert } from "../../../utils/index.js"
import { ImageRenderTarget } from "../../../rendertarget/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { TextureFormat } from "../../../constants/index.js"
import { CameraColorTargets, PrePassTextures } from "../resources/index.js"
import {
  ViewBindGroups,
  ViewBindings,
  ViewUniformBuffer
} from "../../../renderer/index.js"
import { EnvironmentMap, BoneTextureResource } from "../../meshmaterial/resources/index.js"
import { ShadowCasterUniformBuffer, ShadowMap, ShadowViewBindings } from "../../shadow/resources/index.js"
import {
  AmbientLightUniformBuffer,
  DirectionalLightUniformBuffer,
  LightViewBindings,
  PointLightUniformBuffer,
  SpotLightUniformBuffer
} from "../../light/index.js"

export class CameraViewNode {
  subgraph() {
    return undefined
  }

  /**
   * @param {import("../../../renderer/graph/index.js").RenderGraphContext} context
   */
  execute(context) {
    const { objects, renderer, renderDevice } = context
    const views = renderer.getResource(Views)
    const targetPool = renderer.getResource(Texture2DPool)
    const colorTargets = renderer.getResource(CameraColorTargets)
    const prePassTextures = renderer.getResource(PrePassTextures)
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(prePassTextures, "PrePassTextures resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(viewUniformBuffer, "ViewUniformBuffer resource missing")

    for (let i = 0; i < objects.length; i++) {
      const root = /**@type {Object3D} */(objects[i])

      root.traverseDFS((object) => {
        if (!(object instanceof Camera)) {
          return true
        }

        const renderTarget = object.target
        if (!renderTarget) {
          return true
        }

        const position = new Vector3(
          object.transform.world.x,
          object.transform.world.y,
          object.transform.world.z
        )

        renderTarget.changed()
        colorTargets.getOrSet(
          object,
          {
            width: renderTarget.width,
            height: renderTarget.height,
            depth: 1,
            format: TextureFormat.RGBA16Float
          }
        )
        setPrePassTextures(prePassTextures, object, targetPool)
        /** @type {View} */
        const cameraView = new View({
          renderTarget,
          depthTexture: targetPool.get({
            width: renderTarget.width,
            height: renderTarget.height,
            format: TextureFormat.Depth24Plus
          }),
          viewport: object.viewport,
          scissor: object.scissor,
          depthRange: object.depthRange,
          colorLayer: object.target instanceof ImageRenderTarget ? object.target.layer : 0,
          depthLayer: 0,
          colorMipmapLevel: 0,
          depthMipmapLevel: 0,
          near: object.near,
          far: object.far,
          projection: object.projection.asProjectionMatrix(object.near, object.far),
          view: object.view,
          position,
          tag: Camera.name,
          object,
          renderMask: object.renderMask
        })

        const viewObject = cameraView.object

        assert(viewObject, "View object missing")
        const viewBindGroup = viewBindGroups.getOrSet(renderDevice, viewObject)
        populateCameraViewBindGroup(viewBindGroup, renderer, /** @type {Camera} */ (viewObject))

        views.push(cameraView)
        return true
      })
    }
  }
}

/**
 * @param {import("../../../renderer/resources/viewbindgroup.js").ViewBindGroup} viewBindGroup
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 * @param {Camera} camera
 */
function populateCameraViewBindGroup(viewBindGroup, renderer, camera) {
  const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)
  const ambientLightUniformBuffer = renderer.getResource(AmbientLightUniformBuffer)
  const directionalLightUniformBuffer = renderer.getResource(DirectionalLightUniformBuffer)
  const pointLightUniformBuffer = renderer.getResource(PointLightUniformBuffer)
  const shadowCasterUniformBuffer = renderer.getResource(ShadowCasterUniformBuffer)
  const spotLightUniformBuffer = renderer.getResource(SpotLightUniformBuffer)
  const prePassTextures = renderer.getResource(PrePassTextures)
  const environmentMap = renderer.getResource(EnvironmentMap)
  const shadowMap = renderer.getResource(ShadowMap)
  const boneTexture = renderer.getResource(BoneTextureResource)
  const { defaults } = renderer

  assert(viewUniformBuffer, "ViewUniformBuffer resource missing")
  viewBindGroup.setOrReplace(ViewBindings.camera, viewUniformBuffer.buffer)

  if (ambientLightUniformBuffer) {
    viewBindGroup.setOrReplace(LightViewBindings.ambientLight, ambientLightUniformBuffer.buffer)
  }

  if (directionalLightUniformBuffer) {
    viewBindGroup.setOrReplace(LightViewBindings.directionalLights, directionalLightUniformBuffer.buffer)
  }

  if (pointLightUniformBuffer) {
    viewBindGroup.setOrReplace(LightViewBindings.pointLights, pointLightUniformBuffer.buffer)
  }

  if (shadowCasterUniformBuffer) {
    viewBindGroup.setOrReplace(ShadowViewBindings.shadowCasterBlock, shadowCasterUniformBuffer.buffer)
  }

  if (spotLightUniformBuffer) {
    viewBindGroup.setOrReplace(LightViewBindings.spotLights, spotLightUniformBuffer.buffer)
  }

  if (environmentMap) {
    viewBindGroup.setOrReplace(ViewBindings.environmentMap.texture, environmentMap.texture ?? defaults.textureCube)
    viewBindGroup.setOrReplace(ViewBindings.environmentMap.sampler, environmentMap.sampler ?? defaults.textureSampler)
  }

  if (shadowMap) {
    viewBindGroup.setOrReplace(ShadowViewBindings.shadowAtlas.texture, shadowMap.shadowAtlas)
    viewBindGroup.setOrReplace(ShadowViewBindings.shadowAtlas.sampler, shadowMap.sampler)
  }

  if (prePassTextures) {
    const prePassTexture = prePassTextures.get(camera)
    const renderNormals = (camera.prepasses & CameraPrepasses.Normal) !== 0
    const renderDepth = (camera.prepasses & CameraPrepasses.Depth) !== 0 || renderNormals

    if (prePassTexture) {
      if (renderDepth) {
        assert(prePassTexture.depth, "Depth pre-pass texture missing")
        viewBindGroup.setOrReplace(ViewBindings.depthPrePass.texture, prePassTexture.depth)
        viewBindGroup.setOrReplace(ViewBindings.depthPrePass.sampler, defaults.textureNearestSampler)
      }

      if (renderNormals) {
        assert(prePassTexture.normal, "Normal pre-pass texture missing")
        viewBindGroup.setOrReplace(ViewBindings.normalPrePass.texture, prePassTexture.normal)
        viewBindGroup.setOrReplace(ViewBindings.normalPrePass.sampler, defaults.textureNearestSampler)
      }
    }
  }

  if (boneTexture) {
    viewBindGroup.setOrReplace(ViewBindings.boneTransforms.texture, boneTexture.texture)
    viewBindGroup.setOrReplace(ViewBindings.boneTransforms.sampler, defaults.textureNearestSampler)
  }
}

/**
 * @param {PrePassTextures} prePassTextures
 * @param {Camera} camera
 * @param {Texture2DPool} targetPool
 * @returns {void}
 */
function setPrePassTextures(prePassTextures, camera, targetPool) {
  const renderTarget = camera.target

  assert(renderTarget, "Camera render target missing")

  const renderNormals = (camera.prepasses & CameraPrepasses.Normal) !== 0
  const renderDepth = (camera.prepasses & CameraPrepasses.Depth) !== 0 || renderNormals
  const prePassTexture = prePassTextures.getOrSet(camera)

  if (renderDepth) {
    prePassTexture.depth = updatePrePassTexture(
      targetPool,
      prePassTexture.depth,
      {
        width: renderTarget.width,
        height: renderTarget.height,
        depth: 1,
        format: TextureFormat.Depth24Plus
      }
    )
  } else if (prePassTexture.depth) {
    targetPool.recycle(prePassTexture.depth)
    prePassTexture.depth = undefined
  }

  if (renderNormals) {
    prePassTexture.normal = updatePrePassTexture(
      targetPool,
      prePassTexture.normal,
      {
        width: renderTarget.width,
        height: renderTarget.height,
        depth: 1,
        format: TextureFormat.RGBA16Float
      }
    )
  } else if (prePassTexture.normal) {
    targetPool.recycle(prePassTexture.normal)
    prePassTexture.normal = undefined
  }
}

/**
 * @param {Texture2DPool} targetPool
 * @param {import("../../../texture/index.js").Texture | undefined} current
 * @param {import("../../../texture/index.js").TextureSettings} descriptor
 * @returns {import("../../../texture/index.js").Texture}
 */
function updatePrePassTexture(targetPool, current, descriptor) {
  if (current && textureMatchesDescriptor(current, descriptor)) {
    return current
  }

  const nextTexture = targetPool.get(descriptor)

  if (current) {
    targetPool.recycle(current)
  }

  return nextTexture
}

/**
 * @param {import("../../../texture/index.js").Texture} texture
 * @param {import("../../../texture/index.js").TextureSettings} descriptor
 * @returns {boolean}
 */
function textureMatchesDescriptor(texture, descriptor) {
  return (
    texture.width === descriptor.width &&
    texture.height === descriptor.height &&
    texture.depth === descriptor.depth &&
    texture.format === descriptor.format
  )
}
