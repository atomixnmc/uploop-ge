/**
 * Quat — Quaternion (Float32Array-backed, [x, y, z, w])
 *
 * Unit quaternions represent 3D rotations without gimbal lock.
 * Convention: out, a, b — out is destination.
 */

const EPSILON = 0.000001

export function create() {
  const out = new Float32Array(4)
  out[3] = 1  // identity quaternion
  return out
}

export function identity(out) {
  out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 1
  return out
}

export function clone(a) {
  const out = new Float32Array(4)
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3]
  return out
}

export function copy(out, a) {
  out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3]
  return out
}

/** out = a * b (quaternion multiplication = apply b then a) */
export function multiply(out, a, b) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3]
  const bx = b[0], by = b[1], bz = b[2], bw = b[3]
  out[0] = ax * bw + aw * bx + ay * bz - az * by
  out[1] = ay * bw + aw * by + az * bx - ax * bz
  out[2] = az * bw + aw * bz + ax * by - ay * bx
  out[3] = aw * bw - ax * bx - ay * by - az * bz
  return out
}

/** Rotate a by b: out = b * a * conjugate(b) */
export function rotateX(out, a, rad) {
  rad *= 0.5
  const ax = a[0], ay = a[1], az = a[2], aw = a[3]
  const bx = Math.sin(rad), bw = Math.cos(rad)
  out[0] = ax * bw + aw * bx
  out[1] = ay * bw + az * bx
  out[2] = az * bw - ay * bx
  out[3] = aw * bw - ax * bx
  return out
}

export function rotateY(out, a, rad) {
  rad *= 0.5
  const ax = a[0], ay = a[1], az = a[2], aw = a[3]
  const by = Math.sin(rad), bw = Math.cos(rad)
  out[0] = ax * bw - az * by
  out[1] = ay * bw + aw * by
  out[2] = az * bw + ax * by
  out[3] = aw * bw - ay * by
  return out
}

export function rotateZ(out, a, rad) {
  rad *= 0.5
  const ax = a[0], ay = a[1], az = a[2], aw = a[3]
  const bz = Math.sin(rad), bw = Math.cos(rad)
  out[0] = ax * bw + ay * bz
  out[1] = ay * bw - ax * bz
  out[2] = az * bw + aw * bz
  out[3] = aw * bw - az * bz
  return out
}

export function squaredLength(a) {
  return a[0]*a[0] + a[1]*a[1] + a[2]*a[2] + a[3]*a[3]
}

export function length(a) {
  return Math.sqrt(squaredLength(a))
}

export function normalize(out, a) {
  let len = length(a)
  if (len < EPSILON) return identity(out)
  len = 1 / len
  out[0] = a[0] * len; out[1] = a[1] * len
  out[2] = a[2] * len; out[3] = a[3] * len
  return out
}

/** Conjugate: out = ( -x, -y, -z, w ) */
export function conjugate(out, a) {
  out[0] = -a[0]; out[1] = -a[1]; out[2] = -a[2]; out[3] = a[3]
  return out
}

/** Inverse of unit quaternion = conjugate */
export function invert(out, a) {
  return conjugate(out, a)
}

export function negate(out, a) {
  out[0] = -a[0]; out[1] = -a[1]; out[2] = -a[2]; out[3] = -a[3]
  return out
}

export function dot(a, b) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2] + a[3]*b[3]
}

/** Spherical linear interpolation */
export function slerp(out, a, b, t) {
  let cosom = dot(a, b)
  // Flip sign if needed to take shorter path
  if (cosom < 0) {
    cosom = -cosom
    out[0] = -b[0]; out[1] = -b[1]; out[2] = -b[2]; out[3] = -b[3]
  } else {
    copy(out, b)
  }
  if (1 - cosom > EPSILON) {
    const omega = Math.acos(cosom)
    const sinom = Math.sin(omega)
    const s0 = Math.sin((1 - t) * omega) / sinom
    const s1 = Math.sin(t * omega) / sinom
    out[0] = s0 * a[0] + s1 * out[0]
    out[1] = s0 * a[1] + s1 * out[1]
    out[2] = s0 * a[2] + s1 * out[2]
    out[3] = s0 * a[3] + s1 * out[3]
  }
  return out
}

/** Linear interpolation (cheap, not normalized — use slerp for rotation) */
export function lerp(out, a, b, t) {
  out[0] = a[0] + t * (b[0] - a[0])
  out[1] = a[1] + t * (b[1] - a[1])
  out[2] = a[2] + t * (b[2] - a[2])
  out[3] = a[3] + t * (b[3] - a[3])
  return out
}

// --- Construction ---

/** From axis + angle (radians) */
export function fromAxisAngle(out, axis, rad) {
  rad *= 0.5
  const s = Math.sin(rad)
  out[0] = axis[0] * s
  out[1] = axis[1] * s
  out[2] = axis[2] * s
  out[3] = Math.cos(rad)
  return out
}

/** From mat4 rotation component */
export function fromMat4(out, m) {
  const trace = m[0] + m[5] + m[10]
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1)
    out[3] = 0.25 / s
    out[0] = (m[6] - m[9]) * s
    out[1] = (m[8] - m[2]) * s
    out[2] = (m[1] - m[4]) * s
  } else if (m[0] > m[5] && m[0] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[5] - m[10])
    out[3] = (m[6] - m[9]) / s
    out[0] = 0.25 * s
    out[1] = (m[1] + m[4]) / s
    out[2] = (m[8] + m[2]) / s
  } else if (m[5] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[5] - m[0] - m[10])
    out[3] = (m[8] - m[2]) / s
    out[0] = (m[1] + m[4]) / s
    out[1] = 0.25 * s
    out[2] = (m[6] + m[9]) / s
  } else {
    const s = 2 * Math.sqrt(1 + m[10] - m[0] - m[5])
    out[3] = (m[1] - m[4]) / s
    out[0] = (m[8] + m[2]) / s
    out[1] = (m[6] + m[9]) / s
    out[2] = 0.25 * s
  }
  return out
}

/** From Euler angles (see euler.js for order) */
export function fromEuler(out, x, y, z, order = 'YXZ') {
  const cx = Math.cos(x * 0.5), sx = Math.sin(x * 0.5)
  const cy = Math.cos(y * 0.5), sy = Math.sin(y * 0.5)
  const cz = Math.cos(z * 0.5), sz = Math.sin(z * 0.5)

  const qx = new Float32Array([sx, 0, 0, cx])
  const qy = new Float32Array([0, sy, 0, cy])
  const qz = new Float32Array([0, 0, sz, cz])

  const tmp = new Float32Array(4)

  switch (order) {
    case 'XYZ': multiply(tmp, qx, qy); multiply(out, tmp, qz); break
    case 'YXZ': multiply(tmp, qy, qx); multiply(out, tmp, qz); break
    case 'ZXY': multiply(tmp, qz, qx); multiply(out, tmp, qy); break
    case 'ZYX': multiply(tmp, qz, qy); multiply(out, tmp, qx); break
    case 'YZX': multiply(tmp, qy, qz); multiply(out, tmp, qx); break
    case 'XZY': multiply(tmp, qx, qz); multiply(out, tmp, qy); break
    default: multiply(tmp, qy, qx); multiply(out, tmp, qz)
  }
  return out
}

/** From two vectors (rotation that aligns a to b) */
export function fromUnitVectors(out, a, b) {
  const d = dot(a, b)
  if (d > 1 - EPSILON) return identity(out)
  if (d < -1 + EPSILON) {
    // 180° — pick perpendicular axis
    const absX = Math.abs(a[0]), absY = Math.abs(a[1]), absZ = Math.abs(a[2])
    out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0
    if (absX <= absY && absX <= absZ) out[0] = 1
    else if (absY <= absX && absY <= absZ) out[1] = 1
    else out[2] = 1
    const cross = new Float32Array(3)
    // cross = axis × a
    cross[0] = out[1]*a[2] - out[2]*a[1]
    cross[1] = out[2]*a[0] - out[0]*a[2]
    cross[2] = out[0]*a[1] - out[1]*a[0]
    const cl = Math.hypot(cross[0], cross[1], cross[2])
    if (cl > EPSILON) {
      out[0] = cross[0] / cl
      out[1] = cross[1] / cl
      out[2] = cross[2] / cl
    }
    out[3] = 0
    // fromAxisAngle with pi
    out[0] = out[0]  // axis * sin(pi/2) = axis
    out[1] = out[1]
    out[2] = out[2]
    out[3] = 0  // cos(pi/2) = 0 — but wait, for half-angle pi/2: sin=1, cos=0
    return out
  }
  // Normal case
  const cross = new Float32Array(3)
  cross[0] = a[1]*b[2] - a[2]*b[1]
  cross[1] = a[2]*b[0] - a[0]*b[2]
  cross[2] = a[0]*b[1] - a[1]*b[0]
  out[0] = cross[0]
  out[1] = cross[1]
  out[2] = cross[2]
  out[3] = 1 + d
  return normalize(out, out)
}

export function scale(out, a, s) {
  out[0] = a[0] * s; out[1] = a[1] * s
  out[2] = a[2] * s; out[3] = a[3] * s
  return out
}

export function add(out, a, b) {
  out[0] = a[0] + b[0]; out[1] = a[1] + b[1]
  out[2] = a[2] + b[2]; out[3] = a[3] + b[3]
  return out
}

export function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]
}

export function equals(a, b, eps = EPSILON) {
  return Math.abs(a[0]-b[0]) <= eps && Math.abs(a[1]-b[1]) <= eps &&
         Math.abs(a[2]-b[2]) <= eps && Math.abs(a[3]-b[3]) <= eps
}

export function toString(a) {
  return `quat(${a[0]}, ${a[1]}, ${a[2]}, ${a[3]})`
}

export default { create, identity, clone, copy, multiply, rotateX, rotateY, rotateZ,
  squaredLength, length, normalize, conjugate, invert, negate, dot, slerp, lerp,
  fromAxisAngle, fromMat4, fromEuler, fromUnitVectors, scale, add,
  exactEquals, equals, toString }
