/**
 * Vec4 — 4D Vector (Float32Array-backed)
 *
 * Commonly used for homogeneous coordinates, RGBA colors, and quaternion-like ops.
 */

const EPSILON = 0.000001

export function create(x = 0, y = 0, z = 0, w = 0) {
  const out = new Float32Array(4)
  out[0] = x; out[1] = y; out[2] = z; out[3] = w
  return out
}

export function zero() { return create(0, 0, 0, 0) }
export function one() { return create(1, 1, 1, 1) }

export function clone(a) { return create(a[0], a[1], a[2], a[3]) }

export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3]
  return out
}

export function set(out, x, y, z, w) {
  out[0] = x; out[1] = y; out[2] = z; out[3] = w
  return out
}

// --- Arithmetic ---

export function add(out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  out[2] = a[2] + b[2]
  out[3] = a[3] + b[3]
  return out
}

export function subtract(out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  out[2] = a[2] - b[2]
  out[3] = a[3] - b[3]
  return out
}

export function multiply(out, a, b) {
  out[0] = a[0] * b[0]
  out[1] = a[1] * b[1]
  out[2] = a[2] * b[2]
  out[3] = a[3] * b[3]
  return out
}

export function divide(out, a, b) {
  out[0] = a[0] / b[0]
  out[1] = a[1] / b[1]
  out[2] = a[2] / b[2]
  out[3] = a[3] / b[3]
  return out
}

export function scale(out, a, s) {
  out[0] = a[0] * s
  out[1] = a[1] * s
  out[2] = a[2] * s
  out[3] = a[3] * s
  return out
}

export function scaleAndAdd(out, a, b, s) {
  out[0] = a[0] + b[0] * s
  out[1] = a[1] + b[1] * s
  out[2] = a[2] + b[2] * s
  out[3] = a[3] + b[3] * s
  return out
}

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]
}

export function squaredLength(a) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2] + a[3] * a[3]
}

export function length(a) {
  return Math.sqrt(squaredLength(a))
}

export function squaredDistance(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1]
  const dz = a[2] - b[2], dw = a[3] - b[3]
  return dx * dx + dy * dy + dz * dz + dw * dw
}

export function distance(a, b) {
  return Math.sqrt(squaredDistance(a, b))
}

export function normalize(out, a) {
  const len = length(a)
  if (len > EPSILON) {
    out[0] = a[0] / len
    out[1] = a[1] / len
    out[2] = a[2] / len
    out[3] = a[3] / len
  } else {
    out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0
  }
  return out
}

export function negate(out, a) {
  out[0] = -a[0]; out[1] = -a[1]; out[2] = -a[2]; out[3] = -a[3]
  return out
}

export function lerp(out, a, b, t) {
  out[0] = a[0] + t * (b[0] - a[0])
  out[1] = a[1] + t * (b[1] - a[1])
  out[2] = a[2] + t * (b[2] - a[2])
  out[3] = a[3] + t * (b[3] - a[3])
  return out
}

export function min(out, a, b) {
  out[0] = Math.min(a[0], b[0])
  out[1] = Math.min(a[1], b[1])
  out[2] = Math.min(a[2], b[2])
  out[3] = Math.min(a[3], b[3])
  return out
}

export function max(out, a, b) {
  out[0] = Math.max(a[0], b[0])
  out[1] = Math.max(a[1], b[1])
  out[2] = Math.max(a[2], b[2])
  out[3] = Math.max(a[3], b[3])
  return out
}

/** Transform vec4 by mat4 */
export function transformMat4(out, a, m) {
  const x = a[0], y = a[1], z = a[2], w = a[3]
  out[0] = m[0] * x + m[4] * y + m[8]  * z + m[12] * w
  out[1] = m[1] * x + m[5] * y + m[9]  * z + m[13] * w
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w
  return out
}

/** Transform vec4 by quaternion */
export function transformQuat(out, a, q) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3]
  const x = a[0], y = a[1], z = a[2]
  const ix = qw * x + qy * z - qz * y
  const iy = qw * y + qz * x - qx * z
  const iz = qw * z + qx * y - qy * x
  const iw = -qx * x - qy * y - qz * z
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
  out[3] = a[3]
  return out
}

export function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

export function equals(a, b, eps = EPSILON) {
  return Math.abs(a[0] - b[0]) <= eps &&
         Math.abs(a[1] - b[1]) <= eps &&
         Math.abs(a[2] - b[2]) <= eps &&
         Math.abs(a[3] - b[3]) <= eps
}

export function toString(a) {
  return `vec4(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`
}

export function from(a) {
  return [a[0], a[1], a[2], a[3]]
}

export default { create, zero, one, clone, copy, set, add, subtract, multiply,
  divide, scale, scaleAndAdd, dot, squaredLength, length, squaredDistance,
  distance, normalize, negate, lerp, min, max, transformMat4, transformQuat,
  exactEquals, equals, toString, from }
