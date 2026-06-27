/**
 * Ray — 3D Ray (origin + direction)
 *
 * Used for picking, raycasting, and intersection tests.
 */

import * as vec3 from './vec3.js'

const EPSILON = 0.000001

export function createRay(origin, direction) {
  return {
    origin: origin || vec3.create(),
    direction: direction ? vec3.clone(direction) : vec3.set(vec3.create(), 0, 0, -1),
  }
}

export function copy(out, r) {
  vec3.copy(out.origin, r.origin)
  vec3.copy(out.direction, r.direction)
  return out
}

/** Get point at distance t along ray: p = origin + t * direction */
export function at(out, r, t) {
  out[0] = r.origin[0] + r.direction[0] * t
  out[1] = r.origin[1] + r.direction[1] * t
  out[2] = r.origin[2] + r.direction[2] * t
  return out
}

/** Closest point on ray to target point */
export function closestPointToPoint(out, r, point) {
  const dir = r.direction
  const t = vec3.dot(
    vec3.subtract(vec3.create(), point, r.origin),
    dir
  ) / vec3.dot(dir, dir)
  return at(out, r, Math.max(0, t))
}

/** Distance from ray to point */
export function distanceToPoint(r, point) {
  const closest = vec3.create()
  closestPointToPoint(closest, r, point)
  return vec3.distance(closest, point)
}

// --- Intersection tests ---

/** Intersect ray with plane. Returns distance t or null. */
export function intersectPlane(r, plane) {
  const denom = vec3.dot(r.direction, plane.normal)
  if (Math.abs(denom) < EPSILON) return null
  const t = -(vec3.dot(r.origin, plane.normal) + plane.distance) / denom
  return t >= 0 ? t : null
}

/** Intersect ray with sphere. Returns distance t or null. */
export function intersectSphere(r, center, radius) {
  const oc = vec3.subtract(vec3.create(), r.origin, center)
  const a = vec3.dot(r.direction, r.direction)
  const b = 2 * vec3.dot(oc, r.direction)
  const c = vec3.dot(oc, oc) - radius * radius
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const sqrtDisc = Math.sqrt(disc)
  const t0 = (-b - sqrtDisc) / (2 * a)
  if (t0 >= 0) return t0
  const t1 = (-b + sqrtDisc) / (2 * a)
  return t1 >= 0 ? t1 : null
}

/** Intersect ray with AABB. Returns distance t or null. */
export function intersectAABB(r, box) {
  const { min, max } = box
  let tmin = -Infinity, tmax = Infinity
  for (let i = 0; i < 3; i++) {
    if (Math.abs(r.direction[i]) < EPSILON) {
      if (r.origin[i] < min[i] || r.origin[i] > max[i]) return null
      continue
    }
    const invD = 1 / r.direction[i]
    let t1 = (min[i] - r.origin[i]) * invD
    let t2 = (max[i] - r.origin[i]) * invD
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }
  return tmin >= 0 ? tmin : (tmax >= 0 ? tmax : null)
}

/** Intersect ray with triangle (Möller–Trumbore). Returns distance t or null. */
export function intersectTriangle(r, v0, v1, v2) {
  const edge1 = vec3.subtract(vec3.create(), v1, v0)
  const edge2 = vec3.subtract(vec3.create(), v2, v0)
  const h = vec3.cross(vec3.create(), r.direction, edge2)
  const a = vec3.dot(edge1, h)
  if (Math.abs(a) < EPSILON) return null
  const f = 1 / a
  const s = vec3.subtract(vec3.create(), r.origin, v0)
  const u = f * vec3.dot(s, h)
  if (u < 0 || u > 1) return null
  const q = vec3.cross(vec3.create(), s, edge1)
  const v = f * vec3.dot(r.direction, q)
  if (v < 0 || u + v > 1) return null
  const t = f * vec3.dot(edge2, q)
  return t >= EPSILON ? t : null
}

export default { createRay, copy, at, closestPointToPoint, distanceToPoint,
  intersectPlane, intersectSphere, intersectAABB, intersectTriangle }
