/**
 * Collision Detection — Pairwise collision checks.
 *
 * Supports sphere-sphere, sphere-box (closest-point), and box-box (SAT).
 * Returns collision data: normal, depth, contact point, or null if none.
 *
 * @depends @uploop/math
 */

import { vec3, mat4 } from '@uploop/math'

const _tmpV = vec3.create()
const _tmpV2 = vec3.create()

/**
 * Check collision between two colliders with their world transforms.
 * @param {import('./types.js').Collider} a
 * @param {import('./types.js').ColliderTransform} transformA
 * @param {import('./types.js').Collider} b
 * @param {import('./types.js').ColliderTransform} transformB
 * @returns {import('./types.js').CollisionResult|null}
 */
export function checkCollision(a, transformA, b, transformB) {
  if (a.type === 'sphere' && b.type === 'sphere') {
    return sphereSphere(a, transformA, b, transformB)
  }
  if (a.type === 'sphere' && b.type === 'box') {
    return sphereBox(a, transformA, b, transformB)
  }
  if (a.type === 'box' && b.type === 'sphere') {
    const result = sphereBox(b, transformB, a, transformA)
    if (result) {
      vec3.negate(result.normal, result.normal)
    }
    return result
  }
  if (a.type === 'box' && b.type === 'box') {
    return boxBox(a, transformA, b, transformB)
  }
  return null
}

/** Sphere vs Sphere */
function sphereSphere(sA, tA, sB, tB) {
  const d = vec3.create()
  vec3.sub(d, tB.position, tA.position)
  const dist = vec3.length(d)
  const sumR = sA.radius + sB.radius

  if (dist >= sumR || dist < 1e-10) return null

  const normal = vec3.create()
  vec3.scale(normal, d, 1 / dist)
  const depth = sumR - dist

  const point = vec3.create()
  vec3.scaleAndAdd(point, tA.position, normal, sA.radius - depth * 0.5)

  return { colliding: true, normal, depth, point }
}

/** Sphere vs Box — closest point on box to sphere center */
function sphereBox(s, tS, b, tB) {
  // Transform sphere center into box local space
  const localCenter = vec3.create()
  vec3.sub(localCenter, tS.position, tB.position)

  // Clamp to box extents to find closest point (in local space)
  const closest = vec3.create()
  vec3.copy(closest, localCenter)
  for (let i = 0; i < 3; i++) {
    closest[i] = Math.max(-b.halfExtents[i], Math.min(closest[i], b.halfExtents[i]))
  }

  const diff = vec3.create()
  vec3.sub(diff, localCenter, closest)
  const distSq = vec3.lengthSq(diff)

  if (distSq > s.radius * s.radius) return null
  if (distSq < 1e-10) {
    // Sphere center is inside box — push out along smallest penetration axis
    let minPen = Infinity, minAxis = 0
    for (let i = 0; i < 3; i++) {
      const pen = b.halfExtents[i] - Math.abs(localCenter[i])
      if (pen < minPen) { minPen = pen; minAxis = i }
    }
    const normal = vec3.create()
    normal[minAxis] = localCenter[minAxis] > 0 ? 1 : -1
    const point = vec3.create()
    for (let i = 0; i < 3; i++) {
      point[i] = tB.position[i] + (i === minAxis ? normal[i] * b.halfExtents[i] : localCenter[i])
    }
    return { colliding: true, normal, depth: minPen + s.radius, point }
  }

  const dist = Math.sqrt(distSq)
  const normal = vec3.create()
  vec3.scale(normal, diff, 1 / dist)

  const point = vec3.create()
  vec3.scaleAndAdd(point, closest, normal, -s.radius * 0.5)

  return { colliding: true, normal, depth: s.radius - dist, point }
}

/** Box vs Box via Separating Axis Theorem */
function boxBox(bA, tA, bB, tB) {
  // Get world-space axes (simplified: axis-aligned boxes for now)
  // Compute the vector between centers
  const T = vec3.create()
  vec3.sub(T, tB.position, tA.position)

  // Compute overlap on each axis
  const halfSum = vec3.create()
  for (let i = 0; i < 3; i++) {
    halfSum[i] = bA.halfExtents[i] + bB.halfExtents[i]
  }

  let minOverlap = Infinity
  let bestAxis = -1
  const bestNormal = vec3.create()

  for (let i = 0; i < 3; i++) {
    const overlap = halfSum[i] - Math.abs(T[i])
    if (overlap <= 0) return null
    if (overlap < minOverlap) {
      minOverlap = overlap
      bestAxis = i
    }
  }

  const normal = vec3.create()
  normal[bestAxis] = T[bestAxis] > 0 ? 1 : -1

  const point = vec3.create()
  for (let i = 0; i < 3; i++) {
    point[i] = tA.position[i] + normal[i] * bA.halfExtents[i] * (normal[i] > 0 ? 1 : -1)
  }

  return { colliding: true, normal, depth: minOverlap, point }
}

export default { checkCollision }
