import { Material } from "./material.js"
import { OpaqueMode } from "./alphablend.js"
import { basicVertex, normalFragment} from "../shader/index.js"

export class NormalMaterial extends Material {

  /**
   * @type {import("./alphablend.js").AlphaBlend}
   */
  alphaBlend = new OpaqueMode()

  constructor() {
    super()
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
    return normalFragment
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
    return new Float32Array([]).buffer
  }
}
