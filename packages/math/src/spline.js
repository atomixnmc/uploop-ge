/**
 * Spline — Curve Functions
 *
 * Catmull-Rom for smooth camera paths, Bezier for animation curves.
 * All functions take a control point array and a t parameter [0, 1].
 */

import * as vec2 from './vec2.js'
import * as vec3 from './vec3.js'

// --- Catmull-Rom ---

/**
 * Catmull-Rom spline interpolation for Vec3
 * @param {Vec3} out — result
 * @param {Vec3} p0 — point before segment start
 * @param {Vec3} p1 — segment start (t=0)
 * @param {Vec3} p2 — segment end (t=1)
 * @param {Vec3} p3 — point after segment end
 * @param {number} t — 0..1 within [p1, p2]
 * @param {number} [tension=0.5]
 */
export function catmullRom3(out, p0, p1, p2, p3, t, tension = 0.5) {
  const t2 = t * t
  const t3 = t2 * t
  const s = tension
  out[0] = s * ((2*p1[0]) +
    (-p0[0] + p2[0]) * t +
    (2*p0[0] - 5*p1[0] + 4*p2[0] - p3[0]) * t2 +
    (-p0[0] + 3*p1[0] - 3*p2[0] + p3[0]) * t3) +
    p1[0]
  out[1] = s * ((2*p1[1]) +
    (-p0[1] + p2[1]) * t +
    (2*p0[1] - 5*p1[1] + 4*p2[1] - p3[1]) * t2 +
    (-p0[1] + 3*p1[1] - 3*p2[1] + p3[1]) * t3) +
    p1[1]
  out[2] = s * ((2*p1[2]) +
    (-p0[2] + p2[2]) * t +
    (2*p0[2] - 5*p1[2] + 4*p2[2] - p3[2]) * t2 +
    (-p0[2] + 3*p1[2] - 3*p2[2] + p3[2]) * t3) +
    p1[2]
  return out
}

/** Catmull-Rom for Vec2 */
export function catmullRom2(out, p0, p1, p2, p3, t, tension = 0.5) {
  const t2 = t * t, t3 = t2 * t, s = tension
  out[0] = s * ((2*p1[0]) + (-p0[0]+p2[0])*t +
    (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2 +
    (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3) + p1[0]
  out[1] = s * ((2*p1[1]) + (-p0[1]+p2[1])*t +
    (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2 +
    (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3) + p1[1]
  return out
}

/** Catmull-Rom for scalar */
export function catmullRom1(p0, p1, p2, p3, t, tension = 0.5) {
  const t2 = t * t, t3 = t2 * t, s = tension
  return s * ((2*p1) + (-p0+p2)*t +
    (2*p0-5*p1+4*p2-p3)*t2 +
    (-p0+3*p1-3*p2+p3)*t3) + p1
}

// --- Bezier ---

/** Quadratic Bezier (3 control points) for scalar */
export function quadratic(p0, p1, p2, t) {
  const u = 1 - t
  return u * u * p0 + 2 * u * t * p1 + t * t * p2
}

/** Cubic Bezier (4 control points) for scalar */
export function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return u*u*u * p0 + 3*u*u*t * p1 + 3*u*t*t * p2 + t*t*t * p3
}

/** Cubic Bezier for Vec3 */
export function cubic3(out, p0, p1, p2, p3, t) {
  const u = 1 - t
  const u3 = u*u*u, u2t = 3*u*u*t, ut2 = 3*u*t*t, t3 = t*t*t
  out[0] = u3*p0[0] + u2t*p1[0] + ut2*p2[0] + t3*p3[0]
  out[1] = u3*p0[1] + u2t*p1[1] + ut2*p2[1] + t3*p3[1]
  out[2] = u3*p0[2] + u2t*p1[2] + ut2*p2[2] + t3*p3[2]
  return out
}

/** Cubic Bezier for Vec2 */
export function cubic2(out, p0, p1, p2, p3, t) {
  const u = 1 - t, u3 = u*u*u, u2t = 3*u*u*t, ut2 = 3*u*t*t, t3 = t*t*t
  out[0] = u3*p0[0] + u2t*p1[0] + ut2*p2[0] + t3*p3[0]
  out[1] = u3*p0[1] + u2t*p1[1] + ut2*p2[1] + t3*p3[1]
  return out
}

/** Hermite spline (p0, t0 = tangent at p0, p1, t1 = tangent at p1) */
export function hermite(p0, t0, p1, t1, t) {
  const t2 = t * t, t3 = t2 * t
  return (2*t3 - 3*t2 + 1) * p0 +
         (t3 - 2*t2 + t) * t0 +
         (-2*t3 + 3*t2) * p1 +
         (t3 - t2) * t1
}

/** Hermite for Vec3 */
export function hermite3(out, p0, t0, p1, t1, t) {
  const t2 = t * t, t3 = t2 * t
  const h00 = 2*t3 - 3*t2 + 1
  const h10 = t3 - 2*t2 + t
  const h01 = -2*t3 + 3*t2
  const h11 = t3 - t2
  out[0] = h00*p0[0] + h10*t0[0] + h01*p1[0] + h11*t1[0]
  out[1] = h00*p0[1] + h10*t0[1] + h01*p1[1] + h11*t1[1]
  out[2] = h00*p0[2] + h10*t0[2] + h01*p1[2] + h11*t1[2]
  return out
}

export default { catmullRom3, catmullRom2, catmullRom1, quadratic, cubic,
  cubic3, cubic2, hermite, hermite3 }
