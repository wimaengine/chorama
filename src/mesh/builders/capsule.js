// @ts-check
import { Vector2 } from "../../math/index.js"
import { MeshBuilder } from "./base.js"
import { LatheMeshBuilder } from "./lathe.js"

export class CapsuleMeshBuilder extends MeshBuilder {
  radius = 0.5
  height = 2
  segments = 32
  profileSegments = 8

  /** @override */
  build() {
    const capSegments = Math.max(1, this.profileSegments)
    const halfHeight = this.height * 0.5
    const body = Math.max(0, halfHeight - this.radius)
    /** @type {Vector2[]} */
    const profile = []

    for (let i = 0; i <= capSegments; i++) {
      const t = (i / capSegments) * (Math.PI * 0.5)
      profile.push(new Vector2(
        this.radius * Math.sin(t),
        -body - this.radius * Math.cos(t)
      ))
    }

    if (body > 0) {
      profile.push(new Vector2(this.radius, body))
    }

    for (let i = 1; i <= capSegments; i++) {
      const t = (i / capSegments) * (Math.PI * 0.5)
      profile.push(new Vector2(
        this.radius * Math.cos(t),
        body + this.radius * Math.sin(t)
      ))
    }

    const builder = new LatheMeshBuilder()
    builder.profile = profile
    builder.segments = this.segments
    builder.phiStart = 0
    builder.phiLength = Math.PI * 2
    return builder.build()
  }
}
