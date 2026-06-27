/**
 * Mat3 — 3×3 Matrix (Float32Array-backed, column-major)
 *
 * Layout (column-major, matches WebGL/WebGPU uniform expectations):
 *   [0] [3] [6]    col0 col1 col2
 *   [1] [4] [7]
 *   [2] [5] [8]
 */

const EPSILON = 0.000001

export function create() {
  const out = new Float32Array(9)
  out[0] = 1; out[4] = 1; out[8] = 1
  return out
}

export function identity(out) {
  out[0] = 1; out[1] = 0; out[2] = 0
  out[3] = 0; out[4] = 1; out[5] = 0
  out[6] = 0; out[7] = 0; out[8] = 1
  return out
}

export function clone(a) {
  const out = new Float32Array(9)
  for (let i = 0; i < 9; i++) out[i] = a[i]
  return out
}

export function copy(out, a) {
  for (let i = 0; i < 9; i++) out[i] = a[i]
  return out
}

export function multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2]
  const a10 = a[3], a11 = a[4], a12 = a[5]
  const a20 = a[6], a21 = a[7], a22 = a[8]
  const b00 = b[0], b01 = b[1], b02 = b[2]
  const b10 = b[3], b11 = b[4], b12 = b[5]
  const b20 = b[6], b21 = b[7], b22 = b[8]

  out[0] = a00 * b00 + a10 * b01 + a20 * b02
  out[1] = a01 * b00 + a11 * b01 + a21 * b02
  out[2] = a02 * b00 + a12 * b01 + a22 * b02
  out[3] = a00 * b10 + a10 * b11 + a20 * b12
  out[4] = a01 * b10 + a11 * b11 + a21 * b12
  out[5] = a02 * b10 + a12 * b11 + a22 * b12
  out[6] = a00 * b20 + a10 * b21 + a20 * b22
  out[7] = a01 * b20 + a11 * b21 + a21 * b22
  out[8] = a02 * b20 + a12 * b21 + a22 * b22
  return out
}

export function transpose(out, a) {
  if (out === a) {
    const a01 = a[1], a02 = a[2], a12 = a[5]
    out[1] = a[3]; out[2] = a[6]
    out[3] = a01;  out[5] = a[7]
    out[6] = a02;  out[7] = a12
  } else {
    out[0] = a[0]; out[1] = a[3]; out[2] = a[6]
    out[3] = a[1]; out[4] = a[4]; out[5] = a[7]
    out[6] = a[2]; out[7] = a[5]; out[8] = a[8]
  }
  return out
}

export function invert(out, a) {
  const a00 = a[0], a01 = a[1], a02 = a[2]
  const a10 = a[3], a11 = a[4], a12 = a[5]
  const a20 = a[6], a21 = a[7], a22 = a[8]
  const b01 = a22 * a11 - a12 * a21
  const b11 = -a22 * a10 + a12 * a20
  const b21 = a21 * a10 - a11 * a20
  let det = a00 * b01 + a01 * b11 + a02 * b21
  if (Math.abs(det) < EPSILON) return null
  det = 1 / det
  out[0] = b01 * det
  out[1] = (-a22 * a01 + a02 * a21) * det
  out[2] = (a12 * a01 - a02 * a11) * det
  out[3] = b11 * det
  out[4] = (a22 * a00 - a02 * a20) * det
  out[5] = (-a12 * a00 + a02 * a10) * det
  out[6] = b21 * det
  out[7] = (-a21 * a00 + a01 * a20) * det
  out[8] = (a11 * a00 - a01 * a10) * det
  return out
}

export function determinant(a) {
  return a[0] * (a[8] * a[4] - a[5] * a[7])
       + a[1] * (a[5] * a[6] - a[8] * a[3])
       + a[2] * (a[7] * a[3] - a[4] * a[6])
}

export function adjoint(out, a) {
  const a00 = a[0], a01 = a[1], a02 = a[2]
  const a10 = a[3], a11 = a[4], a12 = a[5]
  const a20 = a[6], a21 = a[7], a22 = a[8]
  out[0] = a11 * a22 - a12 * a21
  out[1] = a02 * a21 - a01 * a22
  out[2] = a01 * a12 - a02 * a11
  out[3] = a12 * a20 - a10 * a22
  out[4] = a00 * a22 - a02 * a20
  out[5] = a02 * a10 - a00 * a12
  out[6] = a10 * a21 - a11 * a20
  out[7] = a01 * a20 - a00 * a21
  out[8] = a00 * a11 - a01 * a10
  return out
}

/** 2D translation matrix */
export function fromTranslation(out, v) {
  out[0] = 1; out[1] = 0; out[2] = 0
  out[3] = 0; out[4] = 1; out[5] = 0
  out[6] = v[0]; out[7] = v[1]; out[8] = 1
  return out
}

/** 2D scale matrix */
export function fromScaling(out, v) {
  out[0] = v[0]; out[1] = 0;    out[2] = 0
  out[3] = 0;    out[4] = v[1]; out[5] = 0
  out[6] = 0;    out[7] = 0;    out[8] = 1
  return out
}

/** 2D rotation matrix (radians) */
export function fromRotation(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  out[0] = c;    out[1] = s;   out[2] = 0
  out[3] = -s;   out[4] = c;   out[5] = 0
  out[6] = 0;    out[7] = 0;   out[8] = 1
  return out
}

/** From mat4 upper-left 3×3 */
export function fromMat4(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2]
  out[3] = a[4]; out[4] = a[5]; out[5] = a[6]
  out[6] = a[8]; out[7] = a[9]; out[8] = a[10]
  return out
}

/** Normal matrix = transpose(invert(mat3)) for lighting normals */
export function normalFromMat4(out, a) {
  const a00 = a[0], a01 = a[1], a02 = a[2]
  const a10 = a[4], a11 = a[5], a12 = a[6]
  const a20 = a[8], a21 = a[9], a22 = a[10]
  const b01 = a22 * a11 - a12 * a21
  const b11 = -a22 * a10 + a12 * a20
  const b21 = a21 * a10 - a11 * a20
  let det = a00 * b01 + a01 * b11 + a02 * b21
  if (Math.abs(det) < EPSILON) return null
  det = 1 / det
  out[0] = b01 * det
  out[1] = (-a22 * a01 + a02 * a21) * det
  out[2] = (a12 * a01 - a02 * a11) * det
  out[3] = b11 * det
  out[4] = (a22 * a00 - a02 * a20) * det
  out[5] = (-a12 * a00 + a02 * a10) * det
  out[6] = b21 * det
  out[7] = (-a21 * a00 + a01 * a20) * det
  out[8] = (a11 * a00 - a01 * a10) * det
  return out
}

export function add(out, a, b) {
  for (let i = 0; i < 9; i++) out[i] = a[i] + b[i]
  return out
}

export function subtract(out, a, b) {
  for (let i = 0; i < 9; i++) out[i] = a[i] - b[i]
  return out
}

export function scale(out, a, s) {
  for (let i = 0; i < 9; i++) out[i] = a[i] * s
  return out
}

/** Frobenius norm */
export function frob(a) {
  let s = 0
  for (let i = 0; i < 9; i++) s += a[i] * a[i]
  return Math.sqrt(s)
}

export function exactEquals(a, b) {
  for (let i = 0; i < 9; i++) if (a[i] !== b[i]) return false
  return true
}

export function equals(a, b, eps = EPSILON) {
  for (let i = 0; i < 9; i++) if (Math.abs(a[i] - b[i]) > eps) return false
  return true
}

export default { create, identity, clone, copy, multiply, transpose, invert,
  determinant, adjoint, fromTranslation, fromScaling, fromRotation, fromMat4,
  normalFromMat4, add, subtract, scale, frob, exactEquals, equals }
