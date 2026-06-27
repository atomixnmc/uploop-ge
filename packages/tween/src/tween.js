/**
 * Tween — Interpolate an object's properties from start to end values over time.
 *
 * Supports easing, delay, yoyo (ping-pong), and repeat.
 * Uses @uploop/math/interpolate for easing functions.
 *
 * @depends @uploop/math
 */

import { getEasing } from '@uploop/math/interpolate'

/**
 * Create a tween that animates properties on a target object.
 * @param {Object} target — the object whose properties will be mutated
 * @param {import('./types.js').TweenDescriptor} desc
 * @returns {import('./types.js').Tween}
 */
export function createTween(target, {
  from = {},
  to = {},
  duration = 0,
  easing = 'linear',
  onUpdate = null,
  onComplete = null,
  delay = 0,
  yoyo = false,
  repeat = 0,
} = {}) {
  const _keys = [...new Set([...Object.keys(from), ...Object.keys(to)])]
  const _fn = getEasing(easing)

  let _elapsed = 0
  let _running = false
  let _completed = false
  let _repeatCount = 0
  let _forward = true // false when yoyo-ing back

  const tween = {
    get progress() {
      if (duration <= 0) return 1
      return Math.max(0, Math.min(1, _elapsed / duration))
    },

    get running() { return _running },

    /** Begin or resume the tween. */
    start() {
      _running = true
      _completed = false
      return tween
    },

    /** Pause the tween without resetting. */
    stop() {
      _running = false
      return tween
    },

    /**
     * Advance the tween by dt seconds.
     * @param {number} dt
     */
    update(dt) {
      if (!_running || _completed) return

      _elapsed += dt

      // Handle delay
      const effectiveTime = Math.max(0, _elapsed - delay)
      if (effectiveTime < 0) {
        // Still in delay — hold at from values
        _applyFrom()
        return
      }

      let t = duration > 0 ? Math.min(effectiveTime / duration, 1) : 1

      // Handle yoyo
      let useT = t
      if (yoyo && !_forward) useT = 1 - t

      const easedT = _fn(useT)

      // Interpolate each property
      for (const key of _keys) {
        const a = key in from ? from[key] : (key in to ? to[key] : 0)
        const b = key in to ? to[key] : (key in from ? from[key] : 0)
        target[key] = a + (b - a) * easedT
      }

      if (onUpdate) onUpdate(target)

      if (t >= 1) {
        if (yoyo) {
          _forward = !_forward
          _elapsed = 0

          // Check for full cycle completion
          if (_forward) {
            _repeatCount++
            if (_repeatCount > repeat) {
              _completed = true
              _running = false
              _applyTo() // ensure final state
              if (onComplete) onComplete()
            }
          }
        } else {
          _repeatCount++
          if (_repeatCount > repeat) {
            _completed = true
            _running = false
            _applyTo() // ensure final state
            if (onComplete) onComplete()
          } else {
            _elapsed = 0
          }
        }
      }
    },

    /**
     * Seek to a specific time t (0..1 normalized).
     * @param {number} t — normalized time 0..1
     */
    seek(t) {
      _elapsed = Math.max(0, Math.min(1, t)) * duration
      _completed = false
      _repeatCount = 0
      _forward = true

      // Evaluate at this point
      const effectiveTime = Math.max(0, _elapsed - delay)
      let useT = duration > 0 ? Math.min(effectiveTime / duration, 1) : 1
      const easedT = _fn(useT)

      for (const key of _keys) {
        const a = key in from ? from[key] : (key in to ? to[key] : 0)
        const b = key in to ? to[key] : (key in from ? from[key] : 0)
        target[key] = a + (b - a) * easedT
      }

      if (onUpdate) onUpdate(target)
    },
  }

  function _applyFrom() {
    for (const key of _keys) {
      if (key in from) target[key] = from[key]
    }
  }

  function _applyTo() {
    for (const key of _keys) {
      if (key in to) target[key] = to[key]
    }
  }

  return tween
}

export default { createTween }
