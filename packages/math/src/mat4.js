/**
 * Mat4 — 4×4 Matrix (Float32Array-backed, column-major)
 *
 * Layout:
 *   [0]  [4]  [8]  [12]    col0  col1  col2  col3
 *   [1]  [5]  [9]  [13]
 *   [2]  [6]  [10] [14]
 *   [3]  [7]  [11] [15]
 */

const EPSILON = 0.000001

export function create() {
  const out = new Float32Array(16)
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1
  return out
}

export function identity(out) {
  out.fill(0)
  out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1
  return out
}

export function clone(a) {
  const out = new Float32Array(16)
  for (let i = 0; i < 16; i++) out[i] = a[i]
  return out
}

export function copy(out, a) {
  for (let i = 0; i < 16; i++) out[i] = a[i]
  return out
}

// --- Multiplication ---

export function multiply(out, a, b) {
  const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3]
  const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7]
  const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11]
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]
  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3]
  out[0]  = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3
  out[1]  = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3
  out[2]  = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3
  out[3]  = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3
  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7]
  out[4]  = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3
  out[5]  = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3
  out[6]  = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3
  out[7]  = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3
  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11]
  out[8]  = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3
  out[9]  = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3
  out[10] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3
  out[11] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3
  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15]
  out[12] = a00 * b0 + a10 * b1 + a20 * b2 + a30 * b3
  out[13] = a01 * b0 + a11 * b1 + a21 * b2 + a31 * b3
  out[14] = a02 * b0 + a12 * b1 + a22 * b2 + a32 * b3
  out[15] = a03 * b0 + a13 * b1 + a23 * b2 + a33 * b3
  return out
}

export function transpose(out, a) {
  if (out === a) {
    const a01 = a[1], a02 = a[2], a03 = a[3], a12 = a[6], a13 = a[7], a23 = a[11]
    out[1] = a[4]; out[2] = a[8];  out[3] = a[12]
    out[4] = a01;  out[6] = a[9];  out[7] = a[13]
    out[8] = a02;  out[9] = a12;   out[11] = a[14]
    out[12] = a03; out[13] = a13;  out[14] = a23
  } else {
    out[0] = a[0];  out[1] = a[4];  out[2] = a[8];   out[3] = a[12]
    out[4] = a[1];  out[5] = a[5];  out[6] = a[9];   out[7] = a[13]
    out[8] = a[2];  out[9] = a[6];  out[10] = a[10]; out[11] = a[14]
    out[12] = a[3]; out[13] = a[7]; out[14] = a[11]; out[15] = a[15]
  }
  return out
}

export function invert(out, a) {
  const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3]
  const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7]
  const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11]
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
  if (Math.abs(det) < EPSILON) return null
  det = 1 / det
  out[0]  = (a11 * b11 - a12 * b10 + a13 * b09) * det
  out[1]  = (a02 * b10 - a01 * b11 - a03 * b09) * det
  out[2]  = (a31 * b05 - a32 * b04 + a33 * b03) * det
  out[3]  = (a22 * b04 - a21 * b05 - a23 * b03) * det
  out[4]  = (a12 * b08 - a10 * b11 - a13 * b07) * det
  out[5]  = (a00 * b11 - a02 * b08 + a03 * b07) * det
  out[6]  = (a32 * b02 - a30 * b05 - a33 * b01) * det
  out[7]  = (a20 * b05 - a22 * b02 + a23 * b01) * det
  out[8]  = (a10 * b10 - a11 * b08 + a13 * b06) * det
  out[9]  = (a01 * b08 - a00 * b10 - a03 * b06) * det
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det
  return out
}

export function determinant(a) {
  const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3]
  const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7]
  const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11]
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]
  return (a03 * a12 * a21 * a30 - a02 * a13 * a21 * a30
        - a03 * a11 * a22 * a30 + a01 * a13 * a22 * a30
        + a02 * a11 * a23 * a30 - a01 * a12 * a23 * a30
        - a03 * a12 * a20 * a31 + a02 * a13 * a20 * a31
        + a03 * a10 * a22 * a31 - a00 * a13 * a22 * a31
        - a02 * a10 * a23 * a31 + a00 * a12 * a23 * a31
        + a03 * a11 * a20 * a32 - a01 * a13 * a20 * a32
        - a03 * a10 * a21 * a32 + a00 * a13 * a21 * a32
        + a01 * a10 * a23 * a32 - a00 * a11 * a23 * a32
        - a02 * a11 * a20 * a33 + a01 * a12 * a20 * a33
        + a02 * a10 * a21 * a33 - a00 * a12 * a21 * a33
        - a01 * a10 * a22 * a33 + a00 * a11 * a22 * a33)
}

export function adjoint(out, a) {
  const a00 = a[0],  a01 = a[1],  a02 = a[2],  a03 = a[3]
  const a10 = a[4],  a11 = a[5],  a12 = a[6],  a13 = a[7]
  const a20 = a[8],  a21 = a[9],  a22 = a[10], a23 = a[11]
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]
  out[0]  = a11*(a22*a33 - a23*a32) - a21*(a12*a33 - a13*a32) + a31*(a12*a23 - a13*a22)
  out[1]  = -(a01*(a22*a33 - a23*a32) - a21*(a02*a33 - a03*a32) + a31*(a02*a23 - a03*a22))
  out[2]  = a01*(a12*a33 - a13*a32) - a11*(a02*a33 - a03*a32) + a31*(a02*a13 - a03*a12)
  out[3]  = -(a01*(a12*a23 - a13*a22) - a11*(a02*a23 - a03*a22) + a21*(a02*a13 - a03*a12))
  out[4]  = -(a10*(a22*a33 - a23*a32) - a20*(a12*a33 - a13*a32) + a30*(a12*a23 - a13*a22))
  out[5]  = a00*(a22*a33 - a23*a32) - a20*(a02*a33 - a03*a32) + a30*(a02*a23 - a03*a22)
  out[6]  = -(a00*(a12*a33 - a13*a32) - a10*(a02*a33 - a03*a32) + a30*(a02*a13 - a03*a12))
  out[7]  = a00*(a12*a23 - a13*a22) - a10*(a02*a23 - a03*a22) + a20*(a02*a13 - a03*a12)
  out[8]  = a10*(a21*a33 - a23*a31) - a20*(a11*a33 - a13*a31) + a30*(a11*a23 - a13*a21)
  out[9]  = -(a00*(a21*a33 - a23*a31) - a20*(a01*a33 - a03*a31) + a30*(a01*a23 - a03*a21))
  out[10] = a00*(a11*a33 - a13*a31) - a10*(a01*a33 - a03*a31) + a30*(a01*a13 - a03*a11)
  out[11] = -(a00*(a11*a23 - a13*a21) - a10*(a01*a23 - a03*a21) + a20*(a01*a13 - a03*a11))
  out[12] = -(a10*(a21*a32 - a22*a31) - a20*(a11*a32 - a12*a31) + a30*(a11*a22 - a12*a21))
  out[13] = a00*(a21*a32 - a22*a31) - a20*(a01*a32 - a02*a31) + a30*(a01*a22 - a02*a21)
  out[14] = -(a00*(a11*a32 - a12*a31) - a10*(a01*a32 - a02*a31) + a30*(a01*a12 - a02*a11))
  out[15] = a00*(a11*a22 - a12*a21) - a10*(a01*a22 - a02*a21) + a20*(a01*a12 - a02*a11)
  return out
}

// --- Projection / View ---

export function perspective(out, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  const nf = 1 / (near - far)
  out.fill(0)
  out[0] = f / aspect
  out[5] = f
  out[10] = (far + near) * nf
  out[11] = -1
  out[14] = 2 * far * near * nf
  return out
}

export function ortho(out, left, right, bottom, top, near, far) {
  const lr = 1 / (left - right)
  const bt = 1 / (bottom - top)
  const nf = 1 / (near - far)
  out.fill(0)
  out[0] = -2 * lr
  out[5] = -2 * bt
  out[10] = 2 * nf
  out[12] = (left + right) * lr
  out[13] = (bottom + top) * bt
  out[14] = (far + near) * nf
  out[15] = 1
  return out
}

export function lookAt(out, eye, center, up) {
  let x0, x1, x2, y0, y1, y2, z0, z1, z2, len
  z0 = eye[0] - center[0]; z1 = eye[1] - center[1]; z2 = eye[2] - center[2]
  len = Math.hypot(z0, z1, z2)
  if (len < EPSILON) return identity(out)
  z0 /= len; z1 /= len; z2 /= len
  x0 = up[1] * z2 - up[2] * z1
  x1 = up[2] * z0 - up[0] * z2
  x2 = up[0] * z1 - up[1] * z0
  len = Math.hypot(x0, x1, x2)
  if (len < EPSILON) {
    x0 = z2; x1 = 0; x2 = -z0
    len = Math.hypot(x0, x1, x2)
  }
  x0 /= len; x1 /= len; x2 /= len
  y0 = z1 * x2 - z2 * x1
  y1 = z2 * x0 - z0 * x2
  y2 = z0 * x1 - z1 * x0
  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2])
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2])
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2])
  out[15] = 1
  return out
}

/** Extraction */

export function getTranslation(out, m) {
  out[0] = m[12]; out[1] = m[13]; out[2] = m[14]
  return out
}

export function getScaling(out, m) {
  out[0] = Math.hypot(m[0], m[1], m[2])
  out[1] = Math.hypot(m[4], m[5], m[6])
  out[2] = Math.hypot(m[8], m[9], m[10])
  return out
}

export function getRotation(out, m) {
  const sx = Math.hypot(m[0], m[1], m[2])
  const sy = Math.hypot(m[4], m[5], m[6])
  const sz = Math.hypot(m[8], m[9], m[10])
  out[0] = m[0] / sx; out[1] = m[1] / sx; out[2] = m[2] / sx
  out[3] = 0
  out[4] = m[4] / sy; out[5] = m[5] / sy; out[6] = m[6] / sy
  out[7] = 0
  out[8] = m[8] / sz; out[9] = m[9] / sz; out[10] = m[10] / sz
  out[11] = 0
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1
  return out
}

/** Composition helpers */

export function fromTranslation(out, v) {
  identity(out)
  out[12] = v[0]; out[13] = v[1]; out[14] = v[2]
  return out
}

export function fromScaling(out, v) {
  out.fill(0)
  out[0] = v[0]; out[5] = v[1]; out[10] = v[2]; out[15] = 1
  return out
}

export function fromRotation(out, rad, axis) {
  let x = axis[0], y = axis[1], z = axis[2]
  let len = Math.hypot(x, y, z)
  if (len < EPSILON) return identity(out)
  x /= len; y /= len; z /= len
  const c = Math.cos(rad), s = Math.sin(rad), t = 1 - c
  out[0] = x*x*t + c;     out[1] = y*x*t + z*s;   out[2] = z*x*t - y*s;   out[3] = 0
  out[4] = x*y*t - z*s;   out[5] = y*y*t + c;     out[6] = z*y*t + x*s;   out[7] = 0
  out[8] = x*z*t + y*s;   out[9] = y*z*t - x*s;   out[10] = z*z*t + c;    out[11] = 0
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1
  return out
}

export function fromXRotation(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  out.fill(0)
  out[0] = 1; out[5] = c; out[6] = s; out[10] = c; out[9] = -s; out[15] = 1
  return out
}

export function fromYRotation(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  out.fill(0)
  out[0] = c; out[2] = -s; out[5] = 1; out[8] = s; out[10] = c; out[15] = 1
  return out
}

export function fromZRotation(out, rad) {
  const c = Math.cos(rad), s = Math.sin(rad)
  out.fill(0)
  out[0] = c; out[1] = s; out[4] = -s; out[5] = c; out[10] = 1; out[15] = 1
  return out
}

export function fromQuat(out, q) {
  const x = q[0], y = q[1], z = q[2], w = q[3]
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2
  const yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  out[0] = 1 - (yy + zz); out[1] = xy + wz;       out[2] = xz - wy;       out[3] = 0
  out[4] = xy - wz;       out[5] = 1 - (xx + zz); out[6] = yz + wx;       out[7] = 0
  out[8] = xz + wy;       out[9] = yz - wx;       out[10] = 1 - (xx + yy); out[11] = 0
  out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1
  return out
}

/** Compose TRS: out = translate * rotate * scale */
/** Compose a matrix from translation, quaternion rotation, and scale. */
export function compose(out, translation, quaternion, scaleVec) {
  const x = quaternion[0], y = quaternion[1], z = quaternion[2], w = quaternion[3]
  const x2 = x + x, y2 = y + y, z2 = z + z
  const xx = x * x2, xy = x * y2, xz = x * z2
  const yy = y * y2, yz = y * z2, zz = z * z2
  const wx = w * x2, wy = w * y2, wz = w * z2
  const sx = scaleVec[0], sy = scaleVec[1], sz = scaleVec[2]
  out[0] = (1 - (yy + zz)) * sx; out[1] = (xy + wz) * sx;       out[2] = (xz - wy) * sx;       out[3] = 0
  out[4] = (xy - wz) * sy;       out[5] = (1 - (xx + zz)) * sy; out[6] = (yz + wx) * sy;       out[7] = 0
  out[8] = (xz + wy) * sz;       out[9] = (yz - wx) * sz;       out[10] = (1 - (xx + yy)) * sz; out[11] = 0
  out[12] = translation[0]; out[13] = translation[1]; out[14] = translation[2]; out[15] = 1
  return out
}

/** Compose from rotation, translation, scale (convenience alias, arg order: rot, pos, scale). */
export function fromRotationTranslationScaleOrigin(out, rotation, translation, scaleVec) {
  return compose(out, translation, rotation, scaleVec)
}

/** Decompose mat4 into translation, quaternion, scale */
export function decompose(out_t, out_q, out_s, m) {
  out_t[0] = m[12]; out_t[1] = m[13]; out_t[2] = m[14]
  const m11 = m[0], m12 = m[1], m13 = m[2]
  const m21 = m[4], m22 = m[5], m23 = m[6]
  const m31 = m[8], m32 = m[9], m33 = m[10]
  out_s[0] = Math.hypot(m11, m12, m13)
  out_s[1] = Math.hypot(m21, m22, m23)
  out_s[2] = Math.hypot(m31, m32, m33)
  const isx = 1 / out_s[0], isy = 1 / out_s[1], isz = 1 / out_s[2]
  const sm11 = m11 * isx, sm12 = m12 * isx, sm13 = m13 * isx
  const sm21 = m21 * isy, sm22 = m22 * isy, sm23 = m23 * isy
  const sm31 = m31 * isz, sm32 = m32 * isz, sm33 = m33 * isz
  const trace = sm11 + sm22 + sm33
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    out_q[3] = 0.25 / s
    out_q[0] = (sm23 - sm32) * s
    out_q[1] = (sm31 - sm13) * s
    out_q[2] = (sm12 - sm21) * s
  } else if (sm11 > sm22 && sm11 > sm33) {
    const s = 2 * Math.sqrt(1 + sm11 - sm22 - sm33)
    out_q[3] = (sm23 - sm32) / s
    out_q[0] = 0.25 * s
    out_q[1] = (sm21 + sm12) / s
    out_q[2] = (sm31 + sm13) / s
  } else if (sm22 > sm33) {
    const s = 2 * Math.sqrt(1 + sm22 - sm11 - sm33)
    out_q[3] = (sm31 - sm13) / s
    out_q[0] = (sm21 + sm12) / s
    out_q[1] = 0.25 * s
    out_q[2] = (sm32 + sm23) / s
  } else {
    const s = 2 * Math.sqrt(1 + sm33 - sm11 - sm22)
    out_q[3] = (sm12 - sm21) / s
    out_q[0] = (sm31 + sm13) / s
    out_q[1] = (sm32 + sm23) / s
    out_q[2] = 0.25 * s
  }
}

export function add(out, a, b) {
  for (let i = 0; i < 16; i++) out[i] = a[i] + b[i]
  return out
}

export function subtract(out, a, b) {
  for (let i = 0; i < 16; i++) out[i] = a[i] - b[i]
  return out
}

export function scale(out, a, s) {
  for (let i = 0; i < 16; i++) out[i] = a[i] * s
  return out
}

export function frob(a) {
  let s = 0
  for (let i = 0; i < 16; i++) s += a[i] * a[i]
  return Math.sqrt(s)
}

/** Transform mat4 by vec3 (position, w=1) */
export function transformPoint(out, a, m) {
  const x = a[0], y = a[1], z = a[2]
  out[0] = m[0]*x + m[4]*y + m[8]*z + m[12]
  out[1] = m[1]*x + m[5]*y + m[9]*z + m[13]
  out[2] = m[2]*x + m[6]*y + m[10]*z + m[14]
  return out
}

/** Transform mat4 by vec3 (direction, w=0) */
export function transformVector(out, a, m) {
  const x = a[0], y = a[1], z = a[2]
  out[0] = m[0]*x + m[4]*y + m[8]*z
  out[1] = m[1]*x + m[5]*y + m[9]*z
  out[2] = m[2]*x + m[6]*y + m[10]*z
  return out
}

export function exactEquals(a, b) {
  for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false
  return true
}

export function equals(a, b, eps = EPSILON) {
  for (let i = 0; i < 16; i++) if (Math.abs(a[i] - b[i]) > eps) return false
  return true
}

export default { create, identity, clone, copy, multiply, transpose, invert,
  determinant, adjoint, perspective, ortho, lookAt, getTranslation, getScaling,
  getRotation, fromTranslation, fromScaling, fromRotation, fromXRotation,
  fromYRotation, fromZRotation, fromQuat, compose, decompose, add, subtract,
  scale, frob, transformPoint, transformVector, exactEquals, equals }
