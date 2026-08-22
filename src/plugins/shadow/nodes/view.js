import { Affine3, Matrix4, Vector3 } from "hisabati"
import { DirectionalLight, SpotLight, PointLight, PCFShadowFilter, PCSSShadowFilter } from "../../../objects"
import { Object3D, PerspectiveProjection } from "../../../objects"
import { Views, View, ViewBindGroups, ViewBindings } from "../../../renderer"
import { ShadowMap } from "../resources/ShadowMap"
import { assert } from "../../../utils"
import { BoneTextureResource } from "../../meshmaterial/resources/index.js"

const SHADOW_ITEM_BYTE_SIZE = 96

export class ShadowViewNode {
    subgraph() {
      return undefined
    }

    /**
     * @param {import("../../../renderer").RenderGraphContext} graphcontext
     */
    execute(graphcontext){
    const {renderDevice: device, renderer, objects } = graphcontext
    const { context } = device
    const shadowMap = renderer.getResource(ShadowMap)
    const views = renderer.getResource(Views)
    const viewBindGroups = renderer.getResource(ViewBindGroups)
    /** @type {ShadowItem[]}*/
    const blocks = []
    
    assert(shadowMap, "Shadow map not set up.")
    assert(views, "Views resource missing")
    assert(viewBindGroups, "ViewBindGroups resource missing")

    shadowMap.reset()
    for (let i = 0; i < objects.length; i++) {
      const object = /**@type {Object3D} */ (objects[i]);

      object.traverseDFS((object) => {
        const area = shadowMap.getOrSet(object)
        const items = object instanceof DirectionalLight ?
          buildDirectionalShadowPass(object, shadowMap) :
          object instanceof SpotLight ?
            buildSpotShadowPass(object, shadowMap) :
            object instanceof PointLight ?
              buildPointShadowPass(object, shadowMap) :
              undefined

        if (!items) {
          return true
        }

        area.enabled = true
        area.spaceIndex = blocks.length
        blocks.push(items[0])
        items[1].forEach(e => e.order = -100)
        items[1].forEach((view) => {
          const object = view.object

          assert(object, "View object missing")
          const viewBindGroup = viewBindGroups.getOrSet(device, object)
          populateShadowViewBindGroup(viewBindGroup, renderer)
        })
        views.push(...items[1])

        return true
      })
    }

    const data = new ArrayBuffer(blocks.length * SHADOW_ITEM_BYTE_SIZE)
    const view = new DataView(data)

    for (let i = 0; i < blocks.length; i++) {
      // SAFETY: The array is dense
      /**@type {ShadowItem}*/(blocks[i]).write(view, i * SHADOW_ITEM_BYTE_SIZE)
    }

    renderer.updateUBO(context, {
      name: "ShadowCasterBlock",
      data
    })
    }
}

/**
 * @param {import("../../../renderer/resources/viewbindgroup.js").ViewBindGroup} viewBindGroup
 * @param {import("../../../renderer/renderer.js").WebGLRenderer} renderer
 */
function populateShadowViewBindGroup(viewBindGroup, renderer) {
  const boneTexture = renderer.getResource(BoneTextureResource)

  if (!boneTexture) {
    return
  }

  viewBindGroup.setOrReplace(ViewBindings.boneTransforms.texture, "bone_transforms", boneTexture.texture)
  viewBindGroup.setOrReplace(ViewBindings.boneTransforms.sampler, "bone_transforms", renderer.defaults.textureNearestSampler)
}

/**
 * @param {DirectionalLight} light
 * @param {ShadowMap} shadowMap
 * @returns {[ShadowItem, View[]] | undefined}
 */
function buildDirectionalShadowPass(light, shadowMap) {
  const shadow = light.shadow

  if (!shadow) return

  const [renderTarget, layer] = shadowMap.getTarget()
  const shadowItem = new ShadowItem()
  const projectionMatrix = shadow.projection.asProjectionMatrix(shadow.near, shadow.far)
  const viewMatrix = Affine3.toMatrix4(light.transform.world).invert()
  const view = new View({
    renderTarget,
    position: light.transform.position,
    projection: projectionMatrix,
    view: viewMatrix,
    near: shadow.near,
    far: shadow.far,
    tag: DirectionalLight.name,
    object: light,
    renderMask: light.renderMask
  })


  shadowItem.layer = layer
  shadowItem.bias = shadow.bias
  shadowItem.normalBias = shadow.normalBias
  packShadowMode(shadowItem,shadow.filterMode)
  Matrix4.multiply(projectionMatrix, viewMatrix, shadowItem.matrix)

  return [shadowItem, [view]]
}

/**
 * @param {SpotLight} light
 * @param {ShadowMap} shadowMap
 * @returns {[ShadowItem, View[]] | undefined}
 */
function buildSpotShadowPass(light, shadowMap) {
  const shadow = light.shadow

  if (!shadow) {
    return
  }
  const [renderTarget, layer] = shadowMap.getTarget()
  const shadowItem = new ShadowItem()
  const viewMatrix = Affine3.toMatrix4(light.transform.world).invert()
  const projectionMatrix = new PerspectiveProjection(light.outerAngle, 1).asProjectionMatrix(
    shadow.near,
    light.range
  )
  const view = new View({
    renderTarget,
    position: light.transform.position,
    projection: projectionMatrix,
    view: viewMatrix,
    near: shadow.near,
    far: light.range,
    tag: SpotLight.name,
    object: light,
    renderMask: light.renderMask
  })

  shadowItem.layer = layer
  shadowItem.bias = shadow.bias
  shadowItem.normalBias = shadow.normalBias
  packShadowMode(shadowItem, shadow.filterMode)
  Matrix4.multiply(projectionMatrix, viewMatrix, shadowItem.matrix)

  return [shadowItem, [view]]
}

/**
 * @param {PointLight} light
 * @param {ShadowMap} shadowMap
 * @returns {[ShadowItem, View[]] | undefined}
 * 
 */
function buildPointShadowPass(light, shadowMap) {
  const shadow = light.shadow

  if (!shadow) {
    return
  }
  const shadowItem = new ShadowItem()
  const sides = [
    [Vector3.X, Vector3.NegY],
    [Vector3.NegX, Vector3.NegY],
    [Vector3.Y, Vector3.Z],
    [Vector3.NegY, Vector3.NegZ],
    [Vector3.Z, Vector3.NegY],
    [Vector3.NegZ, Vector3.NegY]
  ]
  const projectionMatrix = new PerspectiveProjection(Math.PI / 2, 1).asProjectionMatrix(
    shadow.near,
    light.radius
  )
  const views = []
  let layerId = 0

  for (let i = 0; i < sides.length; i++) {
    const side = /**@type {[Vector3, Vector3]} */ (sides[i])
    const [renderTarget, layer] = shadowMap.getTarget()

    const worldMatrix = light.transform.world
    const viewMatrix = Affine3.toMatrix4(new Affine3()
      .lookAt(side[0], side[1])
      .translate(new Vector3(
        worldMatrix.x,
        worldMatrix.y,
        worldMatrix.z
      )))
      .invert()

    layerId = layer
    views.push(new View({
      renderTarget,
      view: viewMatrix,
      projection: projectionMatrix,
      position: light.transform.position,
      near: shadow.near,
      far: light.radius,
      tag: PointLight.name,
      object: light,
      renderMask: light.renderMask
    }))
  }

  // Encode clipping planes as they are neccessary for point light shadows
  // Will be unpacked in the corresponding shader
  shadowItem.matrix.a = shadow.near;
  shadowItem.matrix.b = light.radius;

  // We only need the light position for point lights
  shadowItem.matrix.m = light.transform.world.x
  shadowItem.matrix.n = light.transform.world.y
  shadowItem.matrix.o = light.transform.world.z
  shadowItem.bias = shadow.bias
  shadowItem.normalBias = shadow.normalBias
  packShadowMode(shadowItem, shadow.filterMode)
  shadowItem.layer = layerId - 5

  return [shadowItem, views]
}

/**
 * @param {ShadowItem} item
 * @param {import("../../../objects/light/index.js").ShadowFilteringModes} mode
 */
function packShadowMode(item, mode) {
  if (typeof mode === "undefined") {
    item.mode = 0
  } else if (mode instanceof PCFShadowFilter) {
    item.mode = 1
    item.pcfRadius = mode.radius
  } else if (mode instanceof PCSSShadowFilter) {
    item.mode = 2
    item.pcfRadius = mode.radius
    item.pcssSearchRadius = mode.searchRadius
    item.pcssPenumbra = mode.penumbra
  }else {
    throw new Error("Invalid shadow filtering mode")
  }
}

export class ShadowItem {
  matrix = new Matrix4()
  bias = 0.001
  normalBias = 0
  /**
   * 0 = hard compare, 1 = PCF, 2 = PCSS.
   * @type {number}
   */
  mode = 0
  pcfRadius = 0
  pcssSearchRadius = 0
  pcssPenumbra = 0
  layer = 0
  /**
   * @param {DataView} view
   * @param {number} offset
   */
  write(view, offset) {
    let i = 0
    for (const value of this.matrix) {
      view.setFloat32(offset + (i * 4), value, true)
      i++
    }
    view.setFloat32(offset + 64, this.bias, true)
    view.setFloat32(offset + 68, this.normalBias, true)
    view.setFloat32(offset + 72, this.layer, true)
    view.setUint32(offset + 76, this.mode >>> 0, true)
    view.setFloat32(offset + 80, this.pcfRadius, true)
    view.setFloat32(offset + 84, this.pcssSearchRadius, true)
    view.setFloat32(offset + 88, this.pcssPenumbra, true)
    view.setFloat32(offset + 92, 0, true)
  }
}
