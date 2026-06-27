/**
 * @uploop/math — 2D/3D Math Library
 *
 * Pure functions, Float32Array-backed for zero-copy GPU interop.
 * No WebGL/WebGPU dependency — usable on server, worker, anywhere.
 *
 * Usage:
 *   import { vec2, vec3, mat4, quat } from '@uploop/math'
 *   const v = vec2.create(1, 2)
 *   const m = mat4.perspective(mat4.create(), Math.PI/4, 16/9, 0.1, 100)
 */

export * as vec2 from './vec2.js'
export * as vec3 from './vec3.js'
export * as vec4 from './vec4.js'
export * as mat3 from './mat3.js'
export * as mat4 from './mat4.js'
export * as quat from './quat.js'
export { createEuler } from './euler.js'
export * as euler from './euler.js'
export * as color from './color.js'
export { createRay } from './ray.js'
export * as ray from './ray.js'
export { createPlane } from './plane.js'
export * as plane from './plane.js'
export { createAABB } from './aabb.js'
export * as aabb from './aabb.js'
export * as spline from './spline.js'
export * as interpolate from './interpolate.js'
