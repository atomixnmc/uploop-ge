/**
 * @typedef {Float32Array} Vec2   — [x, y]
 * @typedef {Float32Array} Vec3   — [x, y, z]
 * @typedef {Float32Array} Vec4   — [x, y, z, w]
 * @typedef {Float32Array} Mat3   — 3×3 column-major (9 floats)
 * @typedef {Float32Array} Mat4   — 4×4 column-major (16 floats)
 * @typedef {Float32Array} Quat   — [x, y, z, w]
 *
 * @typedef {Object} Euler
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {string} order — 'XYZ' | 'YXZ' | 'ZXY' | 'ZYX' | 'YZX' | 'XZY'
 *
 * @typedef {Object} Ray
 * @property {Vec3} origin
 * @property {Vec3} direction
 *
 * @typedef {Object} Plane
 * @property {Vec3} normal
 * @property {number} distance
 *
 * @typedef {Object} AABB
 * @property {Vec3} min
 * @property {Vec3} max
 *
 * @typedef {'linear'|'smoothstep'|'easeIn'|'easeOut'|'easeInOut'} EasingFn
 */

export default {}
