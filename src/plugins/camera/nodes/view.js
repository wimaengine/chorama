import { Camera, Object3D } from "../../../objects/index.js"
import { View, Views } from "../../../renderer/index.js"
import { Vector3 } from "../../../math/index.js"
import { assert } from "../../../utils/index.js"
import { Texture2DPool } from "../RenderTarget2DPool.js"
import { TextureFormat } from "../../../constants/index.js"
import { CameraColorTargets } from "../resources/index.js"
import { ViewBindGroups } from "../../../renderer/resources/index.js"

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
    const sceneBindGroups = renderer.getResource(ViewBindGroups)

    assert(views, "Views resource missing")
    assert(targetPool, "Render target pool resource missing")
    assert(colorTargets, "Camera color targets resource missing")
    assert(sceneBindGroups, "SceneBindGroups resource missing")

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
      sceneBindGroups.getOrSet(renderDevice, object)

      views.push(cameraView)
    }
  }
}
