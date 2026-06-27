/**
 * Vec2 — 2D Vector (Float32Array-backed)
 *
 * All operations follow the gl-matrix convention:
 *   - First argument is the output (destination)
 *   - Mutating when out === a is intentional and fast
 *   - Factory: vec2.create(x, y) → new Float32Array(2)
 */

const EPSILON = 0.000001

/**
 * Create a new Vec2
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @returns {Vec2}
 */
export function create(x = 0, y = 0) {
  const out = new Float32Array(2)
  out[0] = x
  out[1] = y
  return out
}

/** Create a zero vector */
export function zero() { return create(0, 0) }

/** Create a one-filled vector */
export function one() { return create(1, 1) }

/** Clone a vector */
export function clone(a) { return create(a[0], a[1]) }

/** Copy a into out */
export function copy(out, a) {
  out[0] = a[0]
  out[1] = a[1]
  return out
}

/** Set components */
export function set(out, x, y) {
  out[0] = x
  out[1] = y
  return out
}

// --- Arithmetic ---

/** out = a + b */
export function add(out, a, b) {
  out[0] = a[0] + b[0]
  out[1] = a[1] + b[1]
  return out
}

/** out = a - b */
export function subtract(out, a, b) {
  out[0] = a[0] - b[0]
  out[1] = a[1] - b[1]
  return out
}

/** out = a * b (component-wise) */
export function multiply(out, a, b) {
  out[0] = a[0] * b[0]
  out[1] = a[1] * b[1]
  return out
}

/** out = a / b (component-wise) */
export function divide(out, a, b) {
  out[0] = a[0] / b[0]
  out[1] = a[1] / b[1]
  return out
}

/** out = min(a, b) component-wise */
export function min(out, a, b) {
  out[0] = Math.min(a[0], b[0])
  out[1] = Math.min(a[1], b[1])
  return out
}

/** out = max(a, b) component-wise */
export function max(out, a, b) {
  out[0] = Math.max(a[0], b[0])
  out[1] = Math.max(a[1], b[1])
  return out
}

/** out = a * s */
export function scale(out, a, s) {
  out[0] = a[0] * s
  out[1] = a[1] * s
  return out
}

/** out = a + b * s */
export function scaleAndAdd(out, a, b, s) {
  out[0] = a[0] + b[0] * s
  out[1] = a[1] + b[1] * s
  return out
}

// --- Vector math ---

/** Dot product: a · b */
export function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1]
}

/** Cross product (scalar in 2D): out = a.x*b.y - a.y*b.x */
export function cross(out, a, b) {
  // 2D cross is a scalar, but we write it to out[0] for consistency
  // Actually, 2D cross returns the z-component of the 3D cross
  const z = a[0] * b[0] - a[1] * b[1] // wait, correct formula is a.x*b.y - a.y*b.x
  out[0] = a[0] * b[1] - a[1] * b[0]
  out[1] = 0
  return out
}

/** Squared length */
export function squaredLength(a) {
  return a[0] * a[0] + a[1] * a[1]
}

/** Length / magnitude */
export function length(a) {
  return Math.hypot(a[0], a[1])
}

/** Squared distance between a and b */
export function squaredDistance(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

/** Distance between a and b */
export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** Normalize: out = a / |a| */
export function normalize(out, a) {
  const len = Math.hypot(a[0], a[1])
  if (len > EPSILON) {
    out[0] = a[0] / len
    out[1] = a[1] / len
  } else {
    out[0] = 0
    out[1] = 0
  }
  return out
}

/** Negate: out = -a */
export function negate(out, a) {
  out[0] = -a[0]
  out[1] = -a[1]
  return out
}

/** Linear interpolation: out = a + t * (b - a) */
export function lerp(out, a, b, t) {
  out[0] = a[0] + t * (b[0] - a[0])
  out[1] = a[1] + t * (b[1] - a[1])
  return out
}

/** Perpendicular (rotate 90° CCW) */
export function perpendicular(out, a) {
  out[0] = -a[1]
  out[1] = a[0]
  return out
}

/** Rotate a by angle (radians) */
export function rotate(out, a, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const x = a[0]
  const y = a[1]
  out[0] = x * c - y * s
  out[1] = x * s + y * c
  return out
}

/** Angle between a and b (radians) */
export function angle(a, b) {
  const d = dot(a, b)
  const m = Math.sqrt(squaredLength(a) * squaredLength(b))
  return m > EPSILON ? Math.acos(Math.max(-1, Math.min(1, d / m))) : 0
}

/** Exact equality check */
export function exactEquals(a, b) {
  return a[0] === b[0] && a[1] === b[1]
}

/** Approximate equality check */
export function equals(a, b, eps = EPSILON) {
  return Math.abs(a[0] - b[0]) <= eps && Math.abs(a[1] - b[1]) <= eps
}

/** String representation */
export function toString(a) {
  return `vec2(${a[0]}, ${a[1]})`
}

/** Iterable for destructuring: const [x, y] = vec2.from(a) */
export function from(a) {
  return [a[0], a[1]]
}

export default { create, zero, one, clone, copy, set, add, subtract, multiply, divide,
  min, max, scale, scaleAndAdd, dot, cross, squaredLength, length,
  squaredDistance, distance, normalize, negate, lerp, perpendicular,
  rotate, angle, exactEquals, equals, toString, from }
