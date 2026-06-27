/**
 * Euler — Euler Angle Representation
 *
 * Euler angles are intuitive for humans but suffer from gimbal lock.
 * Use quaternions for rotation logic; Euler for UI/input conversion.
 *
 * Order strings: 'XYZ', 'YXZ', 'ZXY', 'ZYX', 'YZX', 'XZY'
 * Default: 'YXZ' (common in game engines)
 */

import * as quat from './quat.js'
import * as mat4 from './mat4.js'

/**
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @param {number} [z=0]
 * @param {string} [order='YXZ']
 * @returns {Euler}
 */
export function createEuler(x = 0, y = 0, z = 0, order = 'YXZ') {
  return { x, y, z, order }
}

/** Convert Euler to quaternion */
export function toQuat(out, euler) {
  return quat.fromEuler(out, euler.x, euler.y, euler.z, euler.order)
}

/** Convert Euler to mat4 rotation */
export function toMat4(out, euler) {
  return mat4.fromQuat(out, toQuat(new Float32Array(4), euler))
}

/** Set from quaternion */
export function fromQuat(out, q, order) {
  if (order) out.order = order
  // Extract Euler angles from quaternion
  const m = mat4.fromQuat(mat4.create(), q)
  fromMat4(out, m, out.order)
  return out
}

/** Set from mat4 */
export function fromMat4(out, m, order) {
  if (order) out.order = order
  const m11 = m[0], m12 = m[4], m13 = m[8]
  const m21 = m[1], m22 = m[5], m23 = m[9]
  const m31 = m[2], m32 = m[6], m33 = m[10]

  switch (out.order) {
    case 'XYZ':
      out.y = Math.asin(Math.max(-1, Math.min(1, m13)))
      if (Math.abs(m13) < 0.99999) {
        out.x = Math.atan2(-m23, m33)
        out.z = Math.atan2(-m12, m11)
      } else {
        out.x = Math.atan2(m32, m22)
        out.z = 0
      }
      break
    case 'YXZ':
      out.x = Math.asin(-Math.max(-1, Math.min(1, m23)))
      if (Math.abs(m23) < 0.99999) {
        out.y = Math.atan2(m13, m33)
        out.z = Math.atan2(m21, m22)
      } else {
        out.y = Math.atan2(-m31, m11)
        out.z = 0
      }
      break
    case 'ZXY':
      out.x = Math.asin(Math.max(-1, Math.min(1, m32)))
      if (Math.abs(m32) < 0.99999) {
        out.y = Math.atan2(-m31, m33)
        out.z = Math.atan2(-m12, m22)
      } else {
        out.y = 0
        out.z = Math.atan2(m21, m11)
      }
      break
    case 'ZYX':
      out.y = Math.asin(-Math.max(-1, Math.min(1, m31)))
      if (Math.abs(m31) < 0.99999) {
        out.x = Math.atan2(m32, m33)
        out.z = Math.atan2(m21, m11)
      } else {
        out.x = 0
        out.z = Math.atan2(-m12, m22)
      }
      break
    case 'YZX':
      out.z = Math.asin(Math.max(-1, Math.min(1, m21)))
      if (Math.abs(m21) < 0.99999) {
        out.x = Math.atan2(-m23, m22)
        out.y = Math.atan2(-m31, m11)
      } else {
        out.x = 0
        out.y = Math.atan2(m13, m33)
      }
      break
    case 'XZY':
      out.z = Math.asin(-Math.max(-1, Math.min(1, m12)))
      if (Math.abs(m12) < 0.99999) {
        out.x = Math.atan2(m32, m22)
        out.y = Math.atan2(m13, m11)
      } else {
        out.x = Math.atan2(-m23, m33)
        out.y = 0
      }
      break
  }
  return out
}

/** Copy euler */
export function copy(out, a) {
  out.x = a.x; out.y = a.y; out.z = a.z; out.order = a.order
  return out
}

export default { createEuler, toQuat, toMat4, fromQuat, fromMat4, copy }
