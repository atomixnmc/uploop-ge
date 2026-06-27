/**
 * Collider — Shape definitions for collision detection.
 *
 * Three shape types: sphere (radius), box (halfExtents), plane (normal, distance).
 *
 * @depends @uploop/math
 */

import { vec3 } from '@uploop/math'

/**
 * Create a sphere collider.
 * @param {number} radius
 * @returns {import('./types.js').SphereCollider}
 */
export function createSphereCollider(radius = 0.5) {
  return { type: 'sphere', radius }
}

/**
 * Create a box collider.
 * @param {Vec3|number[]} [halfExtents] — [0.5, 0.5, 0.5] default
 * @returns {import('./types.js').BoxCollider}
 */
export function createBoxCollider(halfExtents) {
  const he = vec3.create()
  if (halfExtents) {
    vec3.copy(he, halfExtents)
  } else {
    vec3.set(he, 0.5, 0.5, 0.5)
  }
  return { type: 'box', halfExtents: he }
}

/**
 * Create a plane collider (infinite plane).
 * @param {Vec3} [normal] — defaults to up (0,1,0)
 * @param {number} [distance=0] — signed distance from origin along normal
 * @returns {import('./types.js').PlaneCollider}
 */
export function createPlaneCollider(normal, distance = 0) {
  const n = vec3.create()
  if (normal) {
    vec3.copy(n, normal)
    vec3.normalize(n, n)
  } else {
    vec3.set(n, 0, 1, 0)
  }
  return { type: 'plane', normal: n, distance }
}

export default { createSphereCollider, createBoxCollider, createPlaneCollider }
