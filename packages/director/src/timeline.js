/**
 * Timeline — Sequences behaviors with transitions.
 *
 * A timeline is a HyperGraph sequence: behaviors connect in order,
 * with optional transitions (crossfade) between them.
 *
 * @depends types.js, behaviors.js
 */

/**
 * Create a timeline from a list of behaviors.
 * Behaviors play sequentially. Use `parallel` to group concurrent behaviors.
 *
 * @param {(import('./types.js').Behavior|import('./types.js').Behavior[])[]} segments
 * @param {Object} [opts]
 * @param {boolean} [opts.loop=false]
 * @returns {import('./types.js').Timeline}
 */
export function timeline(segments, { loop = false } = {}) {
  const behaviors = []
  for (const seg of segments) {
    if (Array.isArray(seg)) {
      // Parallel group: all start at same time, progress together
      for (const b of seg) {
        behaviors.push({ ...b, _group: seg })
      }
    } else {
      behaviors.push(seg)
    }
  }
  return { behaviors, currentIndex: 0, loop }
}

/**
 * Create a parallel group (all behaviors run simultaneously).
 * @param {import('./types.js').Behavior[]} behaviors
 * @returns {import('./types.js').Behavior[]}
 */
export function parallel(behaviors) {
  return behaviors
}

/**
 * Wait for a duration (no movement, just time passing).
 * @param {number} duration — seconds
 * @returns {import('./types.js').Behavior}
 */
export function wait(duration) {
  return {
    id: `wait_${Date.now()}`,
    type: 'wait',
    progress: 0,
    duration,
    elapsed: 0,
    easing: 'linear',
    params: {},
    status: 'waiting',
  }
}

export default { timeline, parallel, wait }
