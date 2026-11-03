export class ObjectBase {
  /**
   * @type {string}
   */
  name = ''

  /**
   * Visibility is local to this object. Child visibility is evaluated
   * independently by the systems that collect objects.
   * @type {boolean}
   */
  visible = true

  /**
   * @type {ObjectBase | undefined}
   */
  parent

  /**
   * @type {ObjectBase[]}
   */
  children = []

  renderMask = new RenderMask()

  /**
   * @param {...ObjectBase} children
   */
  add(...children) {
    this.children.push(...children)
    children.forEach(child => child.parent = this)
  }

  /**
   * @param {...ObjectBase} children
   */
  remove(...children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (!child) continue
      const index = this.children.indexOf(child)
      if (index === -1) continue

      child.parent = undefined
      this.children.splice(index, 1)
    }
  }

  /**
   * @param {Traverser} func
   */
  traverseBFS(func) {
    /** @type {ObjectBase[]} */
    const queue = [this]

    while (queue.length) {
      const object = /**@type {ObjectBase}*/ (queue.shift())
      const visible = func(object)

      if (!visible) continue
      queue.push(...object.children)
    }
  }

  /**
   * @param {Traverser} func
   */
  traverseDFS(func) {
    const visible = func(this)

    if (!visible) return
    for (let i = 0; i < this.children.length; i++) {
      const child = /** @type {ObjectBase} */ (this.children[i])
      child.traverseDFS(func)
    }
  }

  /**
   * @param {ObjectBase} object
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   */
  copy(object, entityMap) {
    this.name = object.name
    this.visible = object.visible
    this.renderMask.copy(object.renderMask)
    this.children.length = 0
    this.merge(object, entityMap)

    if (entityMap) {
      entityMap.set(object, this)
    }
    return this
  }

  /**
   * Merges clones of the source children into this object.
   *
   * The local object state is left untouched so callers can use this object as
   * a wrapper while still inheriting the loaded hierarchy.
   *
   * @param {ObjectBase} object
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   * @returns {this}
   */
  merge(object, entityMap) {
    this.add(...object.children.map(child => {
      const childClone = child.clone(entityMap)

      if (entityMap) {
        entityMap.set(child, childClone)
      }

      return childClone
    }))

    return this
  }

  /**
   * @param {Map<ObjectBase, ObjectBase>} [entityMap]
   */
  clone(entityMap) {
    return new /**@type {new (...arg:any) => this}*/(this.constructor)().copy(this, entityMap)
  }
}

/**
 * @callback Traverser
 * @param {ObjectBase} object
 * @returns {boolean}
 */

export class RenderMask {
  inner = -1

  /**
   * Test against a mask (any overlap).
   * @param {RenderMask} mask
   */
  test(mask) {
    return (this.inner & mask.inner) !== 0
  }

  /**
   * Copy another render mask.
   * @param {RenderMask} mask
   */
  copy(mask) {
    this.inner = mask.inner
    return this
  }

  clear() {
    this.inner = 0
    return this
  }

  /**
   * Enable a bit by index.
   * @param {number} index
   */
  on(index) {
    this.inner |= (1 << index)
    return this
  }

  /**
   * Disable a bit by index.
   * @param {number} index
   */
  off(index) {
    this.inner &= ~(1 << index)
    return this
  }

  /**
   * Toggle a bit by index.
   * @param {number} index
   */
  toggle(index) {
    this.inner ^= (1 << index)
    return this
  }
}
