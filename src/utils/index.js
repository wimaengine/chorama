import { Vector2 } from "../math/index.js"

export class ViewRectangle {
  offset = new Vector2()
  size = new Vector2(1, 1)

  /**
   * @param {ViewRectangle} other
   */
  copy(other) {
    this.offset.copy(other.offset)
    this.size.copy(other.size)
    return this
  }

  clone() {
    return new ViewRectangle().copy(this)
  }
}

export class Range {
  start
  end
  constructor(start = 0, end = 1) {
    this.start = start
    this.end = end
  }

  /**
   * @param {Range} other
   */
  copy(other) {
    this.start = other.start
    this.end = other.end
    return this
  }

  clone() {
    return new Range().copy(this)
  }
}

/**
 * Throws an error if the supplied test is null or undefined.
 *
 * @template T
 * @param {T} test
 * @param {string} message
 * @returns {asserts test is NonNullable<T>}
 */
export function assert(test, message) {
  if (test === undefined || test === null) throw message
}

/**
 * Throws an error if the supplied test is false.
 *
 * @template T
 * @param {T} test
 * @param {string} message
 * @returns {void}
 */
export function assertTrue(test, message) {
  if (!test) throw message
}

/**
 * @template T
 * @template {string} U
 * @typedef {T & {__brand: U;}} Brand
 */

/**
 * @param {ArrayBufferLike} source
 * @param {ArrayBufferLike} destination
 * @param {number | undefined} offset
 * @param {number | undefined} length
 */
export function copyBuffer(source, destination, offset, length) {
  const sourceView = new Uint8Array(source)
  const destView = new Uint8Array(destination, offset, length)
  destView.set(sourceView)
}

export class AbstractClassError {
  static Unconstructable = "The class `{0}` is not constructible.Extend the class."
  static MethodUnimplemented = "The method `{0}.{1}()` is not implemented. Override the method without using `super.{1}()`."
  static MethodUncallable = "The method `{0}.{1}()` is not callable.`{0}` is an abstract class."
}

/**
 * @param {string} string
 * @param {string[]} args
 */
export function formatString(string, ...args) {
  return string.replace(/{(\d+)}/g, function (match, number) {
    const index = parseInt(number)
    if (typeof index == 'number') {
      return args[index] || match
    }

    return match
  })
}

/**
 * @param {object} item
 * @param {object} baseConstructor
 * @param {string} methodName
 * @returns {never}
 */
export function abstractMethod(item, baseConstructor, methodName) {
  if (item.constructor === baseConstructor) {
    throw formatString(AbstractClassError.MethodUncallable, item.constructor.name, methodName)
  }
  throw formatString(AbstractClassError.MethodUnimplemented, item.constructor.name, methodName)
}

/**
 * 
 * @param {object} item 
 * @param {object} baseConstructor 
 * @returns {never | void}
 */
export function abstractClass(item, baseConstructor) {
  if(item.constructor === baseConstructor){
    throw formatString(AbstractClassError.Unconstructable, item.constructor.name)
  }
}

export * from "./rendergraph_gui.js"
