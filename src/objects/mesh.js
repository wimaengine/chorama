import { Mesh } from "../mesh/index.js"
import { BasicMaterial } from "../material/basic.js"
import { RawMaterial } from "../material/index.js"
import { Object2D } from "./object2d.js"
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

/**
 * A 2D mesh object using the basic material pipeline.
 */
export class MeshMaterial2D extends Object2D {
  /**
   * @type {Mesh}
   */
  mesh

  /**
   * @type {BasicMaterial}
   */
  material

  /**
   * @param {Mesh} mesh
   * @param {BasicMaterial} material
   */
  constructor(mesh, material) {
    super()
    if (!(material instanceof BasicMaterial)) {
      throw new Error("MeshMaterial2D requires a BasicMaterial")
    }

    this.mesh = mesh
    this.material = material
  }

  /**
   * @override
   * @param {Map<Object2D, Object2D>} [entityMap]
   */
  clone(entityMap) {
    const newMesh = /** @type {this} */ (new MeshMaterial2D(this.mesh, this.material))
    newMesh.copy(this, entityMap)

    newMesh.mesh = this.mesh
    newMesh.material = this.material

    return newMesh
  }
}
