/**
 * KeyframeClip — Named clip with tracks, each containing keyframes.
 *
 * Supports step, linear, and cubic (Catmull-Rom–style) interpolation
 * between keyframes. evaluate(time) returns an object mapping
 * targetPath → interpolated value.
 *
 * @depends @uploop/math
 */

import { getEasing } from './easing.js'

/**
 * Create a keyframe clip.
 * @param {import('./types.js').KeyframeClipDescriptor} desc
 * @returns {import('./types.js').KeyframeClip}
 */
export function createKeyframeClip({ name, duration, tracks }) {
  if (duration <= 0 && tracks.length > 0) {
    // Compute duration from keyframes
    duration = 0
    for (const track of tracks) {
      for (const kf of track.keyframes) {
        if (kf.time > duration) duration = kf.time
      }
    }
  }

  return {
    name,
    duration,
    tracks,

    get duration() { return duration },

    /**
     * Evaluate all tracks at the given time.
     * @param {number} time — seconds, clamped to [0, duration]
     * @returns {Object<string, *>} — { targetPath: value, ... }
     */
    evaluate(time) {
      const t = Math.max(0, Math.min(time, duration))
      const result = {}

      for (const track of tracks) {
        result[track.targetPath] = evaluateTrack(track, t)
      }

      return result
    },
  }
}

/**
 * @param {import('./types.js').Track} track
 * @param {number} t
 * @returns {*}
 */
function evaluateTrack(track, t) {
  const { keyframes, interpolation } = track

  if (keyframes.length === 0) return undefined
  if (keyframes.length === 1) return keyframes[0].value

  // Find surrounding keyframes
  let i0 = 0
  for (let i = keyframes.length - 1; i >= 0; i--) {
    if (keyframes[i].time <= t) { i0 = i; break }
  }
  let i1 = Math.min(i0 + 1, keyframes.length - 1)

  if (i0 === i1) return keyframes[i0].value

  const k0 = keyframes[i0]
  const k1 = keyframes[i1]
  const dt = k1.time - k0.time
  const alpha = dt > 0 ? (t - k0.time) / dt : 0

  const v0 = k0.value
  const v1 = k1.value

  switch (interpolation) {
    case 'step':
      return v0

    case 'linear': {
      if (typeof v0 === 'number') return v0 + alpha * (v1 - v0)
      if (Array.isArray(v0)) return v0.map((vi, idx) => vi + alpha * (v1[idx] - vi))
      return v0
    }

    case 'cubic': {
      // Catmull-Rom: use 4 surrounding keyframes for smooth curve
      const iNeg = Math.max(0, i0 - 1)
      const iPos = Math.min(keyframes.length - 1, i1 + 1)
      const p0 = keyframes[iNeg].value
      const p1 = v0
      const p2 = v1
      const p3 = keyframes[iPos].value

      const fn = getEasing(k0.easing || 'linear')
      const tEased = fn(alpha)

      if (typeof v0 === 'number') return catmullRom(p0, p1, p2, p3, tEased)
      if (Array.isArray(v0)) return v0.map((_, idx) => catmullRom(p0[idx], p1[idx], p2[idx], p3[idx], tEased))
      return v0
    }

    default:
      return v0
  }
}

/** Catmull-Rom interpolation between 4 values */
function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  )
}

export default { createKeyframeClip }
