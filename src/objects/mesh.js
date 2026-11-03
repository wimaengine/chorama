import { Attribute, Mesh } from "../mesh/index.js"
import { RawMaterial } from "../material/index.js"
import { Object3D } from "./object3d.js"
import { Affine3 } from "../math/index.js"
import { Bone3D } from "./bone.js";

export class Skin {
  /**
   * @type {Affine3}
   */
  bindMatrix = Affine3.identity()

  /**
   * @type {Affine3}
   */
  inverseBindMatrix = Affine3.identity()

  /**
   * @type {Bone3D[]}
   */
  bones = []

  /**
   * @type {Affine3[]}
   */
  inverseBindPose = []

  constructor() { }

  clone() {
    const skin = new Skin()
    skin.inverseBindPose = this.inverseBindPose
    skin.bones = this.bones.slice()
    return skin
  }

  setBindPose() {
    for (let i = 0; i < this.bones.length; i++) {
      const bone = /**@type {Bone3D} */ (this.bones[i])
      const element = this.inverseBindPose[i] || new Affine3();
      element.copy(bone.transform.world).invert()
      this.inverseBindPose[i] = element
    }
  }
}

/**
 * @template {RawMaterial} [U = RawMaterial]
 */
export class MeshMaterial3D extends Object3D {
  /**
   * @type {Mesh}
   */
  mesh

  /**
   * @type {U}
   */
  material

  /**
   * @type {Skin | undefined}
   */
  skin

  /**
   * Per-target morph weights for this instance.
   * @type {number[] | undefined}
   */
  morphWeights

  /**
   * @param {Mesh} mesh 
   * @param {U} material 
   */
  constructor(mesh, material) {
    super()

    const hasPosition3D = mesh.attributes.has(Attribute.Position3D.name)
    const hasPosition2D = mesh.attributes.has(Attribute.Position2D.name)
    if (!hasPosition3D || hasPosition2D) {
      throw new Error("MeshMaterial3D requires a mesh with only a position3d attribute")
    }

    this.mesh = mesh
    this.material = material
  }

  /**
   * @override
   * @param {Map<Object3D, Object3D>} [entityMap]
   */
  clone(entityMap) {
    const newMesh = /** @type {this} */ (new MeshMaterial3D(this.mesh, this.material))
    newMesh.copy(this, entityMap)

    newMesh.mesh = this.mesh
    newMesh.material = this.material
    newMesh.skin = this.skin?.clone()
    newMesh.morphWeights = this.morphWeights?.slice()

    return newMesh
  }
}
