/**
 * Ray — Ray creation and intersection helpers.
 *
 * Rays are HyperGraph query nodes: they probe the scene and produce hits.
 *
 * @depends types.js, @uploop/math
 */
import { vec3 } from '@uploop/math'

/**
 * Create a ray from origin through a direction.
 * @param {Float32Array|number[]} origin
 * @param {Float32Array|number[]} direction
 * @param {number} [tMin=0.001]
 * @param {number} [tMax=Infinity]
 * @returns {import('./types.js').Ray}
 */
export function createRay(origin, direction, tMin = 0.001, tMax = Infinity) {
  const dir = vec3.set(vec3.create(), ...direction)
  vec3.normalize(dir, dir)
  return {
    origin: vec3.set(vec3.create(), ...origin),
    direction: dir,
    tMin,
    tMax,
  }
}

/**
 * Create a ray from a camera at pixel (x, y) through a viewport.
 * @param {Float32Array} cameraPos
 * @param {Float32Array} cameraTarget
 * @param {Float32Array} cameraUp
 * @param {number} fov — vertical FOV in radians
 * @param {number} aspect — width / height
 * @param {number} px — pixel x (0..width)
 * @param {number} py — pixel y (0..height)
 * @param {number} width — viewport width
 * @param {number} height — viewport height
 * @returns {import('./types.js').Ray}
 */
export function createCameraRay(cameraPos, cameraTarget, cameraUp, fov, aspect, px, py, width, height) {
  const forward = vec3.create()
  vec3.sub(forward, cameraTarget, cameraPos)
  vec3.normalize(forward, forward)

  const right = vec3.create()
  vec3.cross(right, forward, cameraUp)
  vec3.normalize(right, right)

  const up = vec3.create()
  vec3.cross(up, right, forward)

  const halfH = Math.tan(fov / 2)
  const halfW = halfH * aspect

  const ndcX = (px / width) * 2 - 1
  const ndcY = 1 - (py / height) * 2

  const dir = vec3.create()
  dir[0] = forward[0] + right[0] * ndcX * halfW + up[0] * ndcY * halfH
  dir[1] = forward[1] + right[1] * ndcX * halfW + up[1] * ndcY * halfH
  dir[2] = forward[2] + right[2] * ndcX * halfW + up[2] * ndcY * halfH
  vec3.normalize(dir, dir)

  return createRay(cameraPos, dir)
}

/**
 * Ray-AABB intersection (slab method).
 * @param {import('./types.js').Ray} ray
 * @param {Float32Array} aabbMin
 * @param {Float32Array} aabbMax
 * @param {number} [tMax=Infinity]
 * @returns {number} tMin of intersection, or -1 if miss
 */
export function intersectAABB(ray, aabbMin, aabbMax, tMax = Infinity) {
  let tMin = ray.tMin
  let tMaxVal = Math.min(tMax, ray.tMax)

  for (let i = 0; i < 3; i++) {
    const invD = 1.0 / ray.direction[i]
    let t0 = (aabbMin[i] - ray.origin[i]) * invD
    let t1 = (aabbMax[i] - ray.origin[i]) * invD
    if (invD < 0) { const tmp = t0; t0 = t1; t1 = tmp }
    tMin = Math.max(tMin, t0)
    tMaxVal = Math.min(tMaxVal, t1)
    if (tMin > tMaxVal) return -1
  }

  return tMin
}

/**
 * Ray-Triangle intersection (Möller–Trumbore).
 * @param {import('./types.js').Ray} ray
 * @param {Float32Array} v0
 * @param {Float32Array} v1
 * @param {Float32Array} v2
 * @param {Float32Array} n0 — vertex normal 0
 * @param {Float32Array} n1 — vertex normal 1
 * @param {Float32Array} n2 — vertex normal 2
 * @returns {import('./types.js').Hit}
 */
export function intersectTriangle(ray, v0, v1, v2, n0, n1, n2) {
  const NO_HIT = { hit: false, t: Infinity, position: null, normal: null, material: null, entityIndex: -1, triangleIndex: -1 }

  const edge1 = vec3.create()
  const edge2 = vec3.create()
  vec3.sub(edge1, v1, v0)
  vec3.sub(edge2, v2, v0)

  const h = vec3.create()
  vec3.cross(h, ray.direction, edge2)
  const a = vec3.dot(edge1, h)

  if (Math.abs(a) < 0.0000001) return NO_HIT // parallel

  const f = 1.0 / a
  const s = vec3.create()
  vec3.sub(s, ray.origin, v0)
  const u = f * vec3.dot(s, h)
  if (u < 0 || u > 1) return NO_HIT

  const q = vec3.create()
  vec3.cross(q, s, edge1)
  const v = f * vec3.dot(ray.direction, q)
  if (v < 0 || u + v > 1) return NO_HIT

  const t = f * vec3.dot(edge2, q)
  if (t <= ray.tMin || t >= ray.tMax) return NO_HIT

  // Hit position
  const position = vec3.create()
  position[0] = ray.origin[0] + ray.direction[0] * t
  position[1] = ray.origin[1] + ray.direction[1] * t
  position[2] = ray.origin[2] + ray.direction[2] * t

  // Interpolated normal
  const w = 1 - u - v
  const normal = vec3.create()
  normal[0] = n0[0] * w + n1[0] * u + n2[0] * v
  normal[1] = n0[1] * w + n1[1] * u + n2[1] * v
  normal[2] = n0[2] * w + n2[2] * u + n2[2] * v
  vec3.normalize(normal, normal)

  return { hit: true, t, position, normal, material: null, entityIndex: -1, triangleIndex: -1 }
}

export default { createRay, createCameraRay, intersectAABB, intersectTriangle }
