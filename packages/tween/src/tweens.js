/**
 * TweenManager — Manages a collection of active tweens.
 *
 * Add tweens, remove them, update all at once, or kill all.
 *
 * @depends @uploop/math
 */

import { createTween } from './tween.js'

/**
 * Create a tween manager.
 * @returns {Object} tweenManager
 */
export function createTweenManager() {
  /** @type {Set<import('./types.js').Tween>} */
  const _tweens = new Set()

  const manager = {
    /**
     * Add a tween to the manager. Starts it automatically.
     * @param {import('./types.js').Tween} tween
     * @returns {import('./types.js').Tween}
     */
    add(tween) {
      _tweens.add(tween)
      tween.start()
      return tween
    },

    /**
     * Remove a tween from the manager.
     * @param {import('./types.js').Tween} tween
     */
    remove(tween) {
      tween.stop()
      _tweens.delete(tween)
    },

    /**
     * Update all managed tweens by dt seconds.
     * Removes completed tweens automatically.
     * @param {number} dt
     */
    update(dt) {
      for (const tween of _tweens) {
        tween.update(dt)
        if (!tween.running) {
          _tweens.delete(tween)
        }
      }
    },

    /** Stop and remove all tweens. */
    killAll() {
      for (const tween of _tweens) {
        tween.stop()
      }
      _tweens.clear()
    },

    /** @returns {number} number of active tweens */
    get count() {
      return _tweens.size
    },
  }

  return manager
}

export default { createTweenManager }
