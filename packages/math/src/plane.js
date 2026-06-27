/**
 * Plane — 3D Plane (normal + distance from origin)
 *
 * Plane equation: normal · point + distance = 0
 * Signed distance: normal · point + distance
 */

import * as vec3 from './vec3.js'

export function createPlane(normal, distance = 0) {
  return {
    normal: normal ? vec3.clone(normal) : vec3.set(vec3.create(), 0, 1, 0),
    distance,
  }
}

/** Create from three points (counter-clockwise winding = front) */
export function fromPoints(out, a, b, c) {
  const ab = vec3.subtract(vec3.create(), b, a)
  const ac = vec3.subtract(vec3.create(), c, a)
  vec3.cross(out.normal, ab, ac)
  vec3.normalize(out.normal, out.normal)
  out.distance = -vec3.dot(out.normal, a)
  return out
}

/** Create from normal and point on plane */
export function fromNormalAndPoint(out, normal, point) {
  vec3.copy(out.normal, normal)
  out.distance = -vec3.dot(normal, point)
  return out
}

/** Signed distance from point to plane */
export function distanceToPoint(plane, point) {
  return vec3.dot(plane.normal, point) + plane.distance
}

/** Copy plane */
export function copy(out, p) {
  vec3.copy(out.normal, p.normal)
  out.distance = p.distance
  return out
}

/** Normalize plane (ensures normal is unit length) */
export function normalize(out, p) {
  const len = vec3.length(p.normal)
  out.normal[0] = p.normal[0] / len
  out.normal[1] = p.normal[1] / len
  out.normal[2] = p.normal[2] / len
  out.distance = p.distance / len
  return out
}

/** Project point onto plane */
export function projectPoint(out, plane, point) {
  const d = distanceToPoint(plane, point)
  out[0] = point[0] - plane.normal[0] * d
  out[1] = point[1] - plane.normal[1] * d
  out[2] = point[2] - plane.normal[2] * d
  return out
}

export default { createPlane, fromPoints, fromNormalAndPoint, distanceToPoint,
  copy, normalize, projectPoint }
