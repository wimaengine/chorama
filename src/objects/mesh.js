import { Mesh } from "../mesh/index.js"
import { Object3D } from "./object3d.js"
import { Affine3 } from "../math/index.js"
import { RawMaterial } from "../material/index.js"
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
    const newMesh = super.clone(entityMap)

    newMesh.mesh = this.mesh
    newMesh.material = this.material
    newMesh.skin = this.skin ? this.skin.clone() : undefined

    return newMesh
  }
}
