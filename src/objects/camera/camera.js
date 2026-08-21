import { Affine3, Color, Matrix4 } from "../../math/index.js"
import { Object3D } from "../object3d.js"
import { RenderTarget } from "../../rendertarget/index.js"
import { PerspectiveProjection, Projection } from "./projection.js"
import { Range, ViewRectangle } from "../../utils/index.js"

export class ReinhardToneMapping {
	/**
	 * @type {number}
	 */
	exposure

	/**
	 * @param {ReinhardToneMappingOptions} [options]
	 */
	constructor({ exposure = 1 } = {}) {
		this.exposure = exposure
	}
}

export class ACESFilmicTonemapping {
	/**
	 * @type {number}
	 */
	exposure

	/**
	 * @param {AcesFilmicTonemappingOptions} [options]
	 */
	constructor({ exposure = 1 } = {}) {
		this.exposure = exposure
	}
}

export class AgXTonemapping {
	/**
	 * @type {number}
	 */
	exposure

	/**
	 * @param {AgXTonemappingOptions} [options]
	 */
	constructor({ exposure = 1 } = {}) {
		this.exposure = exposure
	}
}

export class HableTonemapping {
	/**
	 * @type {number}
	 */
	exposure

	/**
	 * @param {HableTonemappingOptions} [options]
	 */
	constructor({ exposure = 1 } = {}) {
		this.exposure = exposure
	}
}

export { HableTonemapping as HableToneMapping }

export class KhronosPBRNeutralTonemapping {
	/**
	 * @type {number}
	 */
	exposure

	/**
	 * @param {KhronosPBRNeutralTonemappingOptions} [options]
	 */
	constructor({ exposure = 1 } = {}) {
		this.exposure = exposure
	}
}

export class Camera extends Object3D {
	near = 0.1
	
	far = 2000

	/**
	 * @type {Color | undefined}
	 */
	clearColor = new Color(0, 0, 0, 1)

	/**
	 * @type {number | undefined}
	 */
	clearDepth = 1

	/**
	 * @type {number | undefined}
	 */
	clearStencil = 0

	/**
	 * @type {ViewRectangle}
	 */
	viewport = new ViewRectangle()

	/**
	 * @type {ViewRectangle | undefined}
	 */
	scissor

	/**
	 * @type {Range}
	 */
	depthRange = new Range()

	/**
	 * @type {RenderTarget}
	 */
	target
	/**
	 * @type {Projection}
	 */
	projection = new PerspectiveProjection()

	/**
	 * Undefined means no camera tone mapping.
	 * @type {ReinhardToneMapping | ACESFilmicTonemapping | AgXTonemapping | HableTonemapping | KhronosPBRNeutralTonemapping | undefined}
	 */
	toneMapping = new ReinhardToneMapping()

	/**
	 * @type {Matrix4}
	 */
	view = new Matrix4()
	
	/**
	 * @param {RenderTarget} target
	 */
	constructor(target){
		super()
		this.target = target
	}
	/**
	 * @override
	 */
	update() {
		super.update()
		const inverseTransform = Affine3.toMatrix4(
			Affine3.invert(this.transform.world)
		)
		this.view.copy(inverseTransform)
	}
	
	getData() {
		const { near, far } = this
		return {
			name: "CameraBlock",
			data: new Float32Array([
				...this.view,
				...this.projection.asProjectionMatrix(near, far),
				...this.transform.position,
				this.near,
				this.far
			]).buffer
		}
	}
}

/**
 * @typedef ReinhardToneMappingOptions
 * @property {number} [exposure]
 */

/**
 * @typedef AcesFilmicTonemappingOptions
 * @property {number} [exposure]
 */

/**
 * @typedef AgXTonemappingOptions
 * @property {number} [exposure]
 */

/**
 * @typedef HableTonemappingOptions
 * @property {number} [exposure]
 */

/**
 * @typedef KhronosPBRNeutralTonemappingOptions
 * @property {number} [exposure]
 */
