/**
 * AABB — Axis-Aligned Bounding Box
 *
 * min/max corners. Useful for culling, spatial queries, and BVH construction.
 */

import * as vec3 from './vec3.js'

const INF = Infinity

export function createAABB(min, max) {
  return {
    min: min || vec3.set(vec3.create(), INF, INF, INF),
    max: max || vec3.set(vec3.create(), -INF, -INF, -INF),
  }
}

/** Create from array of points */
export function fromPoints(out, points) {
  let minX = INF, minY = INF, minZ = INF
  let maxX = -INF, maxY = -INF, maxZ = -INF
  for (const p of points) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0])
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1])
    minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2])
  }
  out.min[0] = minX; out.min[1] = minY; out.min[2] = minZ
  out.max[0] = maxX; out.max[1] = maxY; out.max[2] = maxZ
  return out
}

/** Check if point is inside (including boundary) */
export function containsPoint(box, point) {
  return point[0] >= box.min[0] && point[0] <= box.max[0] &&
         point[1] >= box.min[1] && point[1] <= box.max[1] &&
         point[2] >= box.min[2] && point[2] <= box.max[2]
}

/** Check if two AABBs intersect */
export function intersects(a, b) {
  return a.min[0] <= b.max[0] && a.max[0] >= b.min[0] &&
         a.min[1] <= b.max[1] && a.max[1] >= b.min[1] &&
         a.min[2] <= b.max[2] && a.max[2] >= b.min[2]
}

/** Union of two AABBs (out gets both) */
export function union(out, a, b) {
  out.min[0] = Math.min(a.min[0], b.min[0])
  out.min[1] = Math.min(a.min[1], b.min[1])
  out.min[2] = Math.min(a.min[2], b.min[2])
  out.max[0] = Math.max(a.max[0], b.max[0])
  out.max[1] = Math.max(a.max[1], b.max[1])
  out.max[2] = Math.max(a.max[2], b.max[2])
  return out
}

/** Intersection of two AABBs */
export function intersection(out, a, b) {
  out.min[0] = Math.max(a.min[0], b.min[0])
  out.min[1] = Math.max(a.min[1], b.min[1])
  out.min[2] = Math.max(a.min[2], b.min[2])
  out.max[0] = Math.min(a.max[0], b.max[0])
  out.max[1] = Math.min(a.max[1], b.max[1])
  out.max[2] = Math.min(a.max[2], b.max[2])
  return out
}

/** Expand box by amount in all directions */
export function expand(out, box, amount) {
  out.min[0] = box.min[0] - amount
  out.min[1] = box.min[1] - amount
  out.min[2] = box.min[2] - amount
  out.max[0] = box.max[0] + amount
  out.max[1] = box.max[1] + amount
  out.max[2] = box.max[2] + amount
  return out
}

/** Center point of box */
export function center(out, box) {
  out[0] = (box.min[0] + box.max[0]) * 0.5
  out[1] = (box.min[1] + box.max[1]) * 0.5
  out[2] = (box.min[2] + box.max[2]) * 0.5
  return out
}

/** Size (extent) of box */
export function size(out, box) {
  out[0] = box.max[0] - box.min[0]
  out[1] = box.max[1] - box.min[1]
  out[2] = box.max[2] - box.min[2]
  return out
}

/** Volume of box */
export function volume(box) {
  return (box.max[0] - box.min[0]) * (box.max[1] - box.min[1]) * (box.max[2] - box.min[2])
}

/** Surface area (for SAH in BVH) */
export function surfaceArea(box) {
  const dx = box.max[0] - box.min[0]
  const dy = box.max[1] - box.min[1]
  const dz = box.max[2] - box.min[2]
  return 2 * (dx*dy + dy*dz + dz*dx)
}

/** Grow box to include point */
export function encapsulatePoint(box, point) {
  box.min[0] = Math.min(box.min[0], point[0])
  box.min[1] = Math.min(box.min[1], point[1])
  box.min[2] = Math.min(box.min[2], point[2])
  box.max[0] = Math.max(box.max[0], point[0])
  box.max[1] = Math.max(box.max[1], point[1])
  box.max[2] = Math.max(box.max[2], point[2])
  return box
}

/** Copy box */
export function copy(out, box) {
  vec3.copy(out.min, box.min)
  vec3.copy(out.max, box.max)
  return out
}

/** Clone box */
export function clone(box) {
  return { min: vec3.clone(box.min), max: vec3.clone(box.max) }
}

/** Check if box is empty (min > max in any axis) */
export function isEmpty(box) {
  return box.min[0] > box.max[0] ||
         box.min[1] > box.max[1] ||
         box.min[2] > box.max[2]
}

/** Reset to empty */
export function empty(box) {
  box.min[0] = INF; box.min[1] = INF; box.min[2] = INF
  box.max[0] = -INF; box.max[1] = -INF; box.max[2] = -INF
  return box
}

export default { createAABB, fromPoints, containsPoint, intersects, union,
  intersection, expand, center, size, volume, surfaceArea, encapsulatePoint,
  copy, clone, isEmpty, empty }
