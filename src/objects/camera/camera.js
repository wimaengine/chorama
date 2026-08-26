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

	/**
	 * @param {ReinhardToneMapping} toneMapping
	 * @returns {this}
	 */
	copy(toneMapping) {
		this.exposure = toneMapping.exposure
		return this
	}

	/**
	 * @returns {ReinhardToneMapping}
	 */
	clone() {
		return new ReinhardToneMapping().copy(this)
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

	/**
	 * @param {ACESFilmicTonemapping} toneMapping
	 * @returns {this}
	 */
	copy(toneMapping) {
		this.exposure = toneMapping.exposure
		return this
	}

	/**
	 * @returns {ACESFilmicTonemapping}
	 */
	clone() {
		return new ACESFilmicTonemapping().copy(this)
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

	/**
	 * @param {AgXTonemapping} toneMapping
	 * @returns {this}
	 */
	copy(toneMapping) {
		this.exposure = toneMapping.exposure
		return this
	}

	/**
	 * @returns {AgXTonemapping}
	 */
	clone() {
		return new AgXTonemapping().copy(this)
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

	/**
	 * @param {HableTonemapping} toneMapping
	 * @returns {this}
	 */
	copy(toneMapping) {
		this.exposure = toneMapping.exposure
		return this
	}

	/**
	 * @returns {HableTonemapping}
	 */
	clone() {
		return new HableTonemapping().copy(this)
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

	/**
	 * @param {KhronosPBRNeutralTonemapping} toneMapping
	 * @returns {this}
	 */
	copy(toneMapping) {
		this.exposure = toneMapping.exposure
		return this
	}

	/**
	 * @returns {KhronosPBRNeutralTonemapping}
	 */
	clone() {
		return new KhronosPBRNeutralTonemapping().copy(this)
	}
}

export class Bloom {
	/**
	 * @type {number}
	 */
	threshold

	/**
	 * @type {number}
	 */
	intensity

	/**
	 * Soft-knee width as a fraction of the threshold.
	 * @type {number}
	 */
	softKnee

	/**
	 * @param {BloomOptions} [options]
	 */
	constructor({ threshold = 1, intensity = 0.8, softKnee = 0.5 } = {}) {
		this.threshold = threshold
		this.intensity = intensity
		this.softKnee = softKnee
	}

	/**
	 * @param {Bloom} bloom
	 * @returns {this}
	 */
	copy(bloom) {
		this.threshold = bloom.threshold
		this.intensity = bloom.intensity
		this.softKnee = bloom.softKnee
		return this
	}

	/**
	 * @returns {Bloom}
	 */
	clone() {
		return new Bloom().copy(this)
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
	 * @type {RenderTarget | undefined}
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
	toneMapping = undefined

	/**
	 * Undefined means no camera bloom.
	 * @type {Bloom | undefined}
	 */
	bloom = undefined

	/**
	 * @type {Matrix4}
	 */
	view = new Matrix4()

	/**
	 * @param {RenderTarget | undefined} [target]
	 */
	constructor(target = undefined) {
		super()
		this.target = target
	}

	/**
	 * @override
	 * @param {Camera} object
	 * @param {Map<Object3D, Object3D>} [entityMap]
	 */
	copy(object, entityMap) {
		super.copy(/** @type {any} */(object), entityMap)
		this.near = object.near
		this.far = object.far
		this.clearColor = object.clearColor
			? (this.clearColor ? this.clearColor.copy(object.clearColor) : new Color().copy(object.clearColor))
			: undefined
		this.clearDepth = object.clearDepth
		this.clearStencil = object.clearStencil
		this.viewport.copy(object.viewport)
		this.scissor = object.scissor ? object.scissor.clone() : undefined
		this.depthRange.copy(object.depthRange)
		this.target = object.target
		this.projection = object.projection.clone()
		this.toneMapping = object.toneMapping ? object.toneMapping.clone() : undefined
		this.bloom = object.bloom ? object.bloom.clone() : undefined
		this.view.copy(object.view)
		return this
	}

	/**
	 * @override
	 * @param {Map<Object3D, Object3D>} [entityMap]
	 * @returns {this}
	 */
	clone(entityMap) {
		return super.clone(entityMap)
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

/**
 * @typedef BloomOptions
 * @property {number} [threshold]
 * @property {number} [intensity]
 * @property {number} [softKnee]
 */
