import { Mesh } from "../mesh/index.js"
import { BasicMaterial } from "../material/basic.js"
import { RawMaterial } from "../material/index.js"
import { Object2D } from "./object2d.js"
import { Object3D } from "./object3d.js"
import { Affine2, Affine3 } from "../math/index.js"
import { Bone2D, Bone3D } from "./bone.js"

/**
 * A skeletal skin whose bone and inverse-bind-pose dimensions match.
 *
 * @template {Bone2D | Bone3D} [B = Bone3D]
 * @template {Affine2 | Affine3} [A = Affine3]
 */
export class Skin {
  /**
   * @type {A}
   */
  bindMatrix

  /**
   * @type {A}
   */
  inverseBindMatrix

  /**
   * @type {B[]}
   */
  bones = []

  /**
   * @type {A[]}
   */
  inverseBindPose = []

  /**
   * @param {A} [bindMatrix]
   */
  constructor(bindMatrix = /** @type {A} */ (new Affine3())) {
    this.bindMatrix = bindMatrix
    this.inverseBindMatrix = /** @type {A} */ (bindMatrix.clone())
  }

  clone() {
    const skin = /** @type {Skin<B, A>} */ (new Skin(this.bindMatrix.clone()))
    skin.inverseBindMatrix = /** @type {A} */ (this.inverseBindMatrix.clone())
    skin.inverseBindPose = this.inverseBindPose.map((pose) => /** @type {A} */ (pose.clone()))
    skin.bones = this.bones.slice()
    return skin
  }

  setBindPose() {
    const is2D = this.bones[0] instanceof Bone2D

    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i]

      if (!bone) {
        continue
      }

      if (is2D) {
        const bone2D = /** @type {Bone2D} */ (bone)
        const element = /** @type {Affine2} */ (this.inverseBindPose[i] || new Affine2())
        element.copy(bone2D.transform.world).invert()
        this.inverseBindPose[i] = /** @type {A} */ (element)
      } else {
        const bone3D = /** @type {Bone3D} */ (bone)
        const element = /** @type {Affine3} */ (this.inverseBindPose[i] || new Affine3())
        element.copy(bone3D.transform.world).invert()
        this.inverseBindPose[i] = /** @type {A} */ (element)
      }
    }
  }
}

/**
 * A 2D skeletal skin.
 * @typedef {Skin<Bone2D, Affine2>} Skin2D
 */

/**
 * A 3D skeletal skin.
 * @typedef {Skin<Bone3D, Affine3>} Skin3D
 */

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
   * @type {Skin3D | undefined}
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
   * @type {Skin2D | undefined}
   */
  skin

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
    newMesh.skin = this.skin?.clone()

    return newMesh
  }
}
