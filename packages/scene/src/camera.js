/**
 * Camera — Perspective and orthographic projection cameras.
 *
 * Maintains view and projection matrices, frustum planes for culling.
 * Uses Transform for position/orientation.
 *
 * @depends @uploop/math
 */

import { vec3, mat4, plane } from '@uploop/math'
import { Transform } from './transform.js'

/**
 * Create a perspective camera.
 */
export function PerspectiveCamera({
  fov = Math.PI / 4,
  aspect = 16 / 9,
  near = 0.1,
  far = 1000,
  transform,
} = {}) {
  const _transform = transform || Transform()
  const _projectionMatrix = mat4.create()
  const _viewMatrix = mat4.create()
  const _frustumPlanes = [
    plane.createPlane(), plane.createPlane(),
    plane.createPlane(), plane.createPlane(),
    plane.createPlane(), plane.createPlane(),
  ]
  let _projDirty = true

  const cam = {
    get transform() { return _transform },
    get fov() { return fov }, set fov(v) { fov = v; _projDirty = true },
    get aspect() { return aspect }, set aspect(v) { aspect = v; _projDirty = true },
    get near() { return near }, set near(v) { near = v; _projDirty = true },
    get far() { return far }, set far(v) { far = v; _projDirty = true },

    get projectionMatrix() {
      if (_projDirty) {
        mat4.perspective(_projectionMatrix, fov, aspect, near, far)
        _projDirty = false
      }
      return _projectionMatrix
    },

    get viewMatrix() {
      const pos = _transform.worldPosition
      const fwd = _transform.forward
      const center = vec3.add(vec3.create(), pos, fwd)
      mat4.lookAt(_viewMatrix, pos, center, _transform.up)
      return _viewMatrix
    },

    get viewProjectionMatrix() {
      const vp = mat4.create()
      return mat4.multiply(vp, this.projectionMatrix, this.viewMatrix)
    },

    updateFrustum() {
      const m = this.viewProjectionMatrix
      const p = _frustumPlanes
      vec3.set(p[0].normal, m[3]+m[0], m[7]+m[4], m[11]+m[8]); p[0].distance = m[15]+m[12]
      vec3.set(p[1].normal, m[3]-m[0], m[7]-m[4], m[11]-m[8]); p[1].distance = m[15]-m[12]
      vec3.set(p[2].normal, m[3]+m[1], m[7]+m[5], m[11]+m[9]); p[2].distance = m[15]+m[13]
      vec3.set(p[3].normal, m[3]-m[1], m[7]-m[5], m[11]-m[9]); p[3].distance = m[15]-m[13]
      vec3.set(p[4].normal, m[3]+m[2], m[7]+m[6], m[11]+m[10]); p[4].distance = m[15]+m[14]
      vec3.set(p[5].normal, m[3]-m[2], m[7]-m[6], m[11]-m[10]); p[5].distance = m[15]-m[14]
      for (const pl of p) plane.normalize(pl, pl)
    },

    get frustumPlanes() { return _frustumPlanes },
    markDirty() { _projDirty = true },
  }

  return cam
}

/**
 * Create an orthographic camera.
 */
export function OrthographicCamera({
  left = -10, right = 10,
  bottom = -10, top = 10,
  near = 0.1, far = 1000,
  transform,
} = {}) {
  const _transform = transform || Transform()
  const _viewMatrix = mat4.create()
  const _frustumPlanes = [
    plane.createPlane(), plane.createPlane(),
    plane.createPlane(), plane.createPlane(),
    plane.createPlane(), plane.createPlane(),
  ]
  let _left = left, _right = right, _bottom = bottom, _top = top
  let _near = near, _far = far
  let _projDirty = true
  const _projectionMatrix = mat4.create()

  const cam = {
    get transform() { return _transform },
    get left() { return _left }, set left(v) { _left = v; _projDirty = true },
    get right() { return _right }, set right(v) { _right = v; _projDirty = true },
    get bottom() { return _bottom }, set bottom(v) { _bottom = v; _projDirty = true },
    get top() { return _top }, set top(v) { _top = v; _projDirty = true },
    get near() { return _near }, set near(v) { _near = v; _projDirty = true },
    get far() { return _far }, set far(v) { _far = v; _projDirty = true },

    get projectionMatrix() {
      if (_projDirty) {
        mat4.ortho(_projectionMatrix, _left, _right, _bottom, _top, _near, _far)
        _projDirty = false
      }
      return _projectionMatrix
    },

    get viewMatrix() {
      const pos = _transform.worldPosition
      const fwd = _transform.forward
      const center = vec3.add(vec3.create(), pos, fwd)
      mat4.lookAt(_viewMatrix, pos, center, _transform.up)
      return _viewMatrix
    },

    get viewProjectionMatrix() {
      const vp = mat4.create()
      return mat4.multiply(vp, this.projectionMatrix, this.viewMatrix)
    },

    updateFrustum() {
      const m = this.viewProjectionMatrix
      const p = _frustumPlanes
      vec3.set(p[0].normal, m[3]+m[0], m[7]+m[4], m[11]+m[8]); p[0].distance = m[15]+m[12]
      vec3.set(p[1].normal, m[3]-m[0], m[7]-m[4], m[11]-m[8]); p[1].distance = m[15]-m[12]
      vec3.set(p[2].normal, m[3]+m[1], m[7]+m[5], m[11]+m[9]); p[2].distance = m[15]+m[13]
      vec3.set(p[3].normal, m[3]-m[1], m[7]-m[5], m[11]-m[9]); p[3].distance = m[15]-m[13]
      vec3.set(p[4].normal, m[3]+m[2], m[7]+m[6], m[11]+m[10]); p[4].distance = m[15]+m[14]
      vec3.set(p[5].normal, m[3]-m[2], m[7]-m[6], m[11]-m[10]); p[5].distance = m[15]-m[14]
      for (const pl of p) plane.normalize(pl, pl)
    },

    get frustumPlanes() { return _frustumPlanes },
    markDirty() { _projDirty = true },
  }

  return cam
}

export default { PerspectiveCamera, OrthographicCamera }
