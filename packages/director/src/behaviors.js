/**
 * Behaviors — Cinematic camera and object movement primitives.
 *
 * Each behavior is a pure function: (progress, params) → output value.
 * Behaviors are composed into timelines by the Director.
 *
 * @depends types.js, @uploop/math
 */
import { vec3, quat } from '@uploop/math'

/**
 * Dolly: linear movement between two positions.
 * @param {Object} opts
 * @param {Float32Array|number[]} opts.from
 * @param {Float32Array|number[]} opts.to
 * @param {number} opts.duration — seconds
 * @param {string} [opts.easing='linear']
 * @returns {import('./types.js').Behavior}
 */
export function dolly({ from, to, duration, easing = 'linear' } = {}) {
  const f = vec3.set(vec3.create(), ...from)
  const t = vec3.set(vec3.create(), ...to)
  return {
    id: `dolly_${Date.now()}`,
    type: 'dolly',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { from: f, to: t },
    status: 'waiting',
  }
}

/**
 * Orbit: rotate camera around a target point.
 * @param {Object} opts
 * @param {Float32Array|number[]} opts.target — orbit center
 * @param {number} [opts.radius=5] — distance from target
 * @param {number} [opts.speed=0.5] — radians per second
 * @param {number} [opts.pitch=0.4] — vertical angle (radians)
 * @param {number} opts.duration
 * @param {string} [opts.easing='linear']
 * @returns {import('./types.js').Behavior}
 */
export function orbit({ target, radius = 5, speed = 0.5, pitch = 0.4, duration, easing = 'linear' } = {}) {
  const t = vec3.set(vec3.create(), ...target)
  return {
    id: `orbit_${Date.now()}`,
    type: 'orbit',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { target: t, radius, speed, pitch, startAngle: 0 },
    status: 'waiting',
  }
}

/**
 * Track: follow a path defined by control points (Catmull-Rom spline).
 * @param {Object} opts
 * @param {Float32Array[]|number[][]} opts.path — array of control points
 * @param {number} opts.duration
 * @param {string} [opts.easing='linear']
 * @param {boolean} [opts.closed=false]
 * @returns {import('./types.js').Behavior}
 */
export function track({ path, duration, easing = 'linear', closed = false } = {}) {
  return {
    id: `track_${Date.now()}`,
    type: 'track',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { path: path.map(p => vec3.set(vec3.create(), ...p)), closed },
    status: 'waiting',
  }
}

/**
 * Pan: rotate camera horizontally and vertically.
 * @param {Object} opts
 * @param {number} opts.yaw — total horizontal angle (radians)
 * @param {number} [opts.pitch=0]
 * @param {number} opts.duration
 * @param {string} [opts.easing='linear']
 * @returns {import('./types.js').Behavior}
 */
export function pan({ yaw, pitch = 0, duration, easing = 'linear' } = {}) {
  return {
    id: `pan_${Date.now()}`,
    type: 'pan',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { yaw, pitch, startYaw: 0, startPitch: 0 },
    status: 'waiting',
  }
}

/**
 * Crane: vertical + horizontal arc movement (crane shot).
 * @param {Object} opts
 * @param {Float32Array|number[]} base — ground-level position
 * @param {number} height — max crane height
 * @param {number} [swing=0] — horizontal swing (radians)
 * @param {number} opts.duration
 * @param {string} [opts.easing='easeInOutQuad']
 * @returns {import('./types.js').Behavior}
 */
export function crane({ base, height, swing = 0, duration, easing = 'easeInOutQuad' } = {}) {
  const b = vec3.set(vec3.create(), ...base)
  return {
    id: `crane_${Date.now()}`,
    type: 'crane',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { base: b, height, swing },
    status: 'waiting',
  }
}

/**
 * Zoom: change field of view over time.
 * @param {Object} opts
 * @param {number} opts.from — starting FOV (radians)
 * @param {number} opts.to — ending FOV (radians)
 * @param {number} opts.duration
 * @param {string} [opts.easing='linear']
 * @returns {import('./types.js').Behavior}
 */
export function zoom({ from, to, duration, easing = 'linear' } = {}) {
  return {
    id: `zoom_${Date.now()}`,
    type: 'zoom',
    progress: 0,
    duration,
    elapsed: 0,
    easing,
    params: { from, to },
    status: 'waiting',
  }
}

export default { dolly, orbit, track, pan, crane, zoom }
