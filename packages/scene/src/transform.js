/**
 * Transform — Position, rotation, scale with optional parent-child hierarchy.
 *
 * Uses @uploop/math for underlying vec3/quat types. Maintains local and
 * world matrices with dirty-flag caching.
 *
 * @depends @uploop/math
 */

import { vec3, quat, mat4 } from '@uploop/math'

let _nextId = 1

export function Transform(position, rotation, scale, parent = null) {
  const _localPos = position ? vec3.clone(position) : vec3.create()
  const _localRot = rotation ? quat.clone(rotation) : quat.create()
  const _localScale = scale ? vec3.clone(scale) : vec3.set(vec3.create(), 1, 1, 1)
  const _localMatrix = mat4.create()
  const _worldMatrix = mat4.create()
  const _children = []
  const id = _nextId++

  const t = {
    id,
    parent,
    _dirty: true,
    _worldDirty: true,

    get position() { return _localPos },
    set position(v) { vec3.copy(_localPos, v); this._dirty = true },

    get rotation() { return _localRot },
    set rotation(v) { quat.copy(_localRot, v); this._dirty = true },

    get scale() { return _localScale },
    set scale(v) { vec3.copy(_localScale, v); this._dirty = true },

    get children() { return _children },

    get localMatrix() {
      if (this._dirty) {
        mat4.compose(_localMatrix, _localPos, _localRot, _localScale)
        this._worldDirty = true
        this._dirty = false
      }
      return _localMatrix
    },

    get worldMatrix() {
      if (this._worldDirty || this._dirty) {
        this.localMatrix // ensure local is up-to-date
        if (this.parent) {
          mat4.multiply(_worldMatrix, this.parent.worldMatrix, _localMatrix)
        } else {
          mat4.copy(_worldMatrix, _localMatrix)
        }
        this._worldDirty = false
        for (const child of _children) {
          child._markWorldDirty()
        }
      }
      return _worldMatrix
    },

    /** Force recompute of matrices next access */
    markDirty() {
      this._dirty = true
      this._worldDirty = true
      for (const child of _children) child.markDirty()
    },

    /** Mark world matrix dirty (called by parent) */
    _markWorldDirty() {
      this._worldDirty = true
      for (const child of _children) child._markWorldDirty()
    },

    get forward() {
      const fwd = vec3.set(vec3.create(), 0, 0, -1)
      return vec3.transformQuat(fwd, fwd, _localRot)
    },

    get up() {
      const up = vec3.set(vec3.create(), 0, 1, 0)
      return vec3.transformQuat(up, up, _localRot)
    },

    get right() {
      const r = vec3.set(vec3.create(), 1, 0, 0)
      return vec3.transformQuat(r, r, _localRot)
    },

    translate(delta) {
      vec3.add(_localPos, _localPos, delta)
      this._dirty = true
    },

    rotate(q) {
      quat.multiply(_localRot, _localRot, q)
      this._dirty = true
    },

    rotateWorld(axis, angle) {
      const q = quat.create()
      quat.fromAxisAngle(q, axis, angle)
      quat.multiply(_localRot, q, _localRot)
      this._dirty = true
    },

    lookAt(target, up = vec3.set(vec3.create(), 0, 1, 0)) {
      const m = mat4.create()
      mat4.lookAt(m, _localPos, target, up)
      const inv = mat4.create()
      mat4.invert(inv, m)
      quat.fromMat4(_localRot, inv)
      this._dirty = true
    },

    addChild(child) {
      if (child.parent) child.parent.removeChild(child)
      child.parent = this
      _children.push(child)
      child._markWorldDirty()
    },

    removeChild(child) {
      const idx = _children.indexOf(child)
      if (idx >= 0) _children.splice(idx, 1)
      child.parent = null
    },

    get worldPosition() {
      const m = this.worldMatrix
      return vec3.create(m[12], m[13], m[14])
    },

    clone() {
      return Transform(
        vec3.clone(_localPos),
        quat.clone(_localRot),
        vec3.clone(_localScale),
        null
      )
    },
  }

  return t
}

export default { Transform }
