import { Camera, Object3D } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { Vector3 } from "../../../math/index.js"
import { assert } from "../../../utils/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { TextureFormat } from "../../../constants/index.js"
import { CameraColorTargets } from "../resources/index.js"
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
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")
    assert(viewUniformBuffer, "ViewUniformBuffer resource missing")

    for (let i = 0; i < objects.length; i++) {
      const camera = /**@type {Object3D} */(objects[i])

      if (!(camera instanceof Camera)) {
        continue
      }

      const renderTarget = camera.target
      const position = new Vector3(
        camera.transform.world.x,
        camera.transform.world.y,
        camera.transform.world.z
      )

      renderTarget.changed()
      colorTargets.getOrSet(
        camera,
        targetPool,
        {
          width: renderTarget.width,
          height: renderTarget.height,
          depth: 1,
          format: TextureFormat.RGBA16Float
        }
      )
      /** @type {View} */
      const cameraView = new View({
        renderTarget,
        depthTexture: targetPool.get({
          width: renderTarget.width,
          height: renderTarget.height,
          format: TextureFormat.Depth24Plus
        }),
        near: camera.near,
        far: camera.far,
        projection: camera.projection.asProjectionMatrix(camera.near, camera.far),
        view: camera.view,
        position,
        tag: Camera.name,
        object: camera,
        renderMask: camera.renderMask
      })

      const object = cameraView.object

      assert(object, "View object missing")
      const viewBindGroup = viewBindGroups.getOrSet(renderDevice, object)
      populateCameraViewBindGroup(viewBindGroup, renderer)

      views.push(cameraView)
    }
  }
}

/**
 * @param {import("../../../renderer/resources/viewbindgroup.js").ViewBindGroup} viewBindGroup
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 */
function populateCameraViewBindGroup(viewBindGroup, renderer) {
  const viewUniformBuffer = renderer.getResource(ViewUniformBuffer)
  const ambientLightUniformBuffer = renderer.getResource(AmbientLightUniformBuffer)
  const directionalLightUniformBuffer = renderer.getResource(DirectionalLightUniformBuffer)
  const pointLightUniformBuffer = renderer.getResource(PointLightUniformBuffer)
  const shadowCasterUniformBuffer = renderer.getResource(ShadowCasterUniformBuffer)
  const spotLightUniformBuffer = renderer.getResource(SpotLightUniformBuffer)
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

  if (boneTexture) {
    viewBindGroup.setOrReplace(ViewBindings.boneTransforms.texture, boneTexture.texture)
    viewBindGroup.setOrReplace(ViewBindings.boneTransforms.sampler, defaults.textureNearestSampler)
  }
}
