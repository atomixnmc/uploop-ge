/**
 * Vec3 — 3D Vector (Float32Array-backed)
 *
 * Convention: out, a, b, ... — out is the destination.
 * All ops are safe when out === a (mutation).
 */

const EPSILON = 0.000001

export function create(x = 0, y = 0, z = 0) {
  const out = new Float32Array(3)
  out[0] = x; out[1] = y; out[2] = z
  return out
}

export function zero() { return create(0, 0, 0) }
export function one() { return create(1, 1, 1) }

export function clone(a) { return create(a[0], a[1], a[2]) }

export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2]
  return out
}

export function set(out, x, y, z) {
  out[0] = x; out[1] = y; out[2] = z
  return out
}

// --- Arithmetic ---

export function add(out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  out[2] = a[2] + b[2]
  return out
}

export function subtract(out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  out[2] = a[2] - b[2]
  return out
}

/** Alias for subtract */
export const sub = subtract

export function multiply(out, a, b) {
  out[0] = a[0] * b[0]
  out[1] = a[1] * b[1]
  out[2] = a[2] * b[2]
  return out
}

export function divide(out, a, b) {
  out[0] = a[0] / b[0]
  out[1] = a[1] / b[1]
  out[2] = a[2] / b[2]
  return out
}

export function min(out, a, b) {
  out[0] = Math.min(a[0], b[0])
  out[1] = Math.min(a[1], b[1])
  out[2] = Math.min(a[2], b[2])
  return out
}

export function max(out, a, b) {
  out[0] = Math.max(a[0], b[0])
  out[1] = Math.max(a[1], b[1])
  out[2] = Math.max(a[2], b[2])
  return out
}

export function scale(out, a, s) {
  out[0] = a[0] * s
  out[1] = a[1] * s
  out[2] = a[2] * s
  return out
}

export function scaleAndAdd(out, a, b, s) {
  out[0] = a[0] + b[0] * s
  out[1] = a[1] + b[1] * s
  out[2] = a[2] + b[2] * s
  return out
}

// --- Vector math ---

export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2]
  const bx = b[0], by = b[1], bz = b[2]
  out[0] = ay * bz - az * by
  out[1] = az * bx - ax * bz
  out[2] = ax * by - ay * bx
  return out
}

export function squaredLength(a) {
  return a[0] * a[0] + a[1] * a[1] + a[2] * a[2]
}

export function length(a) {
  return Math.hypot(a[0], a[1], a[2])
}

export function squaredDistance(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function normalize(out, a) {
  const len = Math.hypot(a[0], a[1], a[2])
  if (len > EPSILON) {
    out[0] = a[0] / len
    out[1] = a[1] / len
    out[2] = a[2] / len
  } else {
    out[0] = 0; out[1] = 0; out[2] = 0
  }
  return out
}

export function negate(out, a) {
  out[0] = -a[0]; out[1] = -a[1]; out[2] = -a[2]
  return out
}

export function lerp(out, a, b, t) {
  out[0] = a[0] + t * (b[0] - a[0])
  out[1] = a[1] + t * (b[1] - a[1])
  out[2] = a[2] + t * (b[2] - a[2])
  return out
}

/** Rotate around X axis */
export function rotateX(out, a, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  const y = a[1], z = a[2]
  out[0] = a[0]
  out[1] = y * c - z * s
  out[2] = y * s + z * c
  return out
}

/** Rotate around Y axis */
export function rotateY(out, a, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  const x = a[0], z = a[2]
  out[0] = x * c + z * s
  out[1] = a[1]
  out[2] = -x * s + z * c
  return out
}

/** Rotate around Z axis */
export function rotateZ(out, a, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  const x = a[0], y = a[1]
  out[0] = x * c - y * s
  out[1] = x * s + y * c
  out[2] = a[2]
  return out
}

/** Angle between a and b */
export function angle(a, b) {
  const d = dot(a, b)
  const m = Math.sqrt(squaredLength(a) * squaredLength(b))
  return m > EPSILON ? Math.acos(Math.max(-1, Math.min(1, d / m))) : 0
}

/** Project a onto b: out = b * (a·b / |b|²) */
export function project(out, a, b) {
  const s = dot(a, b) / squaredLength(b)
  return scale(out, b, s)
}

/** Reflect a off plane with normal n: out = a - 2*(a·n)*n */
export function reflect(out, a, n) {
  const d = dot(a, n)
  out[0] = a[0] - 2 * d * n[0]
  out[1] = a[1] - 2 * d * n[1]
  out[2] = a[2] - 2 * d * n[2]
  return out
}

export function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function equals(a, b, eps = EPSILON) {
  return Math.abs(a[0] - b[0]) <= eps &&
         Math.abs(a[1] - b[1]) <= eps &&
         Math.abs(a[2] - b[2]) <= eps
}

export function toString(a) {
  return `vec3(${a[0]}, ${a[1]}, ${a[2]})`
}

export function from(a) {
  return [a[0], a[1], a[2]]
}

/** Transform vec3 by mat3 */
export function transformMat3(out, a, m) {
  const x = a[0], y = a[1], z = a[2]
  out[0] = m[0] * x + m[3] * y + m[6] * z
  out[1] = m[1] * x + m[4] * y + m[7] * z
  out[2] = m[2] * x + m[5] * y + m[8] * z
  return out
}

/** Transform vec3 by mat4 (as direction, w=0) */
export function transformMat4(out, a, m) {
  const x = a[0], y = a[1], z = a[2]
  out[0] = m[0] * x + m[4] * y + m[8]  * z
  out[1] = m[1] * x + m[5] * y + m[9]  * z
  out[2] = m[2] * x + m[6] * y + m[10] * z
  return out
}

/** Transform vec3 by quaternion */
export function transformQuat(out, a, q) {
  const qx = q[0], qy = q[1], qz = q[2], qw = q[3]
  const ix = qw * a[0] + qy * a[2] - qz * a[1]
  const iy = qw * a[1] + qz * a[0] - qx * a[2]
  const iz = qw * a[2] + qx * a[1] - qy * a[0]
  const iw = -qx * a[0] - qy * a[1] - qz * a[2]
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx
  return out
}

export default { create, zero, one, clone, copy, set, add, subtract, multiply,
  divide, min, max, scale, scaleAndAdd, dot, cross, squaredLength, length,
  squaredDistance, distance, normalize, negate, lerp, rotateX, rotateY, rotateZ,
  angle, project, reflect, exactEquals, equals, toString, from,
  transformMat3, transformMat4, transformQuat }
