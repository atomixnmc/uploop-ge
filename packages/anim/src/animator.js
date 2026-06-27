/**
 * Animator — Manages playback of multiple KeyframeClips.
 *
 * Each active clip tracks elapsed time, speed, and loop state.
 * Call update(dt) each frame to advance all clips.
 *
 * Usage:
 *   const animator = createAnimator()
 *   animator.play(walkClip, { loop: true, speed: 1.5 })
 *   // In game loop:
 *   animator.update(dt)
 *   const values = walkClip.evaluate(animator.getElapsed('walk'))
 *
 * @depends @uploop/math
 */

import { createKeyframeClip } from './keyframe.js'

/**
 * @returns {Object} animator instance
 */
export function createAnimator() {
  /** @type {Map<string, import('./types.js').ActiveClip>} */
  const _active = new Map()

  const animator = {
    /**
     * Start playing a clip.
     * @param {import('./types.js').KeyframeClip} clip
     * @param {import('./types.js').PlayOptions} [options]
     * @returns {import('./types.js').ActiveClip}
     */
    play(clip, options = {}) {
      const { loop = false, speed = 1, onComplete } = options
      const entry = {
        clip,
        elapsed: 0,
        speed,
        loop,
        onComplete: onComplete || null,
      }
      _active.set(clip.name, entry)
      return entry
    },

    /**
     * Stop a clip by name.
     * @param {string} name
     */
    stop(name) {
      _active.delete(name)
    },

    /**
     * Advance all active clips by dt seconds.
     * @param {number} dt
     */
    update(dt) {
      for (const [name, entry] of _active) {
        entry.elapsed += dt * entry.speed

        const dur = entry.clip.duration
        if (entry.elapsed >= dur) {
          if (entry.loop) {
            entry.elapsed = entry.elapsed % dur
          } else {
            entry.elapsed = dur
            if (entry.onComplete) entry.onComplete()
            _active.delete(name)
          }
        }
      }
    },

    /**
     * Get the elapsed time for a clip by name.
     * @param {string} name
     * @returns {number} elapsed seconds, or -1 if not active
     */
    getElapsed(name) {
      const entry = _active.get(name)
      return entry ? entry.elapsed : -1
    },

    /**
     * @returns {import('./types.js').ActiveClip[]} all currently active clips
     */
    get currentClips() {
      return [..._active.values()]
    },

    /** Stop all clips immediately. */
    stopAll() {
      _active.clear()
    },
  }

  return animator
}

export default { createAnimator }
