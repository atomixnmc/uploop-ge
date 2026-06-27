/**
 * Easing — Interpolation functions for smooth transitions.
 *
 * Standard easing curves used by behaviors and timeline transitions.
 *
 * @depends types.js
 */

/** @type {Record<string, (t: number) => number>} */
export const EASING = {
  linear: t => t,

  // Quad
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  // Cubic
  easeInCubic: t => t * t * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quart
  easeInQuart: t => t * t * t * t,
  easeOutQuart: t => 1 - (--t) * t * t * t,
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  // Quint
  easeInQuint: t => t * t * t * t * t,
  easeOutQuint: t => 1 + (--t) * t * t * t * t,
  easeInOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,

  // Sine
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: t => Math.sin(t * Math.PI / 2),
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  // Expo
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: t => {
    if (t === 0) return 0
    if (t === 1) return 1
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2
  },

  // Circ
  easeInCirc: t => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: t => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: t => {
    t *= 2
    if (t < 1) return -(Math.sqrt(1 - t * t) - 1) / 2
    t -= 2
    return (Math.sqrt(1 - t * t) + 1) / 2
  },

  // Back
  easeInBack: t => {
    const s = 1.70158
    return t * t * ((s + 1) * t - s)
  },
  easeOutBack: t => {
    const s = 1.70158
    return (--t) * t * ((s + 1) * t + s) + 1
  },
  easeInOutBack: t => {
    const s = 1.70158 * 1.525
    t *= 2
    if (t < 1) return 0.5 * (t * t * ((s + 1) * t - s))
    t -= 2
    return 0.5 * (t * t * ((s + 1) * t + s) + 2)
  },

  // Elastic
  easeInElastic: t => {
    if (t === 0 || t === 1) return t
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI)
  },
  easeOutElastic: t => {
    if (t === 0 || t === 1) return t
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1
  },
  easeInOutElastic: t => {
    if (t === 0 || t === 1) return t
    t *= 2
    if (t < 1) return -0.5 * Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI)
    return 0.5 * Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI) + 1
  },

  // Bounce
  easeInBounce: t => 1 - EASING.easeOutBounce(1 - t),
  easeOutBounce: t => {
    if (t < 1 / 2.75) return 7.5625 * t * t
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75 }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375 }
    t -= 2.625 / 2.75
    return 7.5625 * t * t + 0.984375
  },
  easeInOutBounce: t => t < 0.5
    ? (1 - EASING.easeOutBounce(1 - 2 * t)) / 2
    : (1 + EASING.easeOutBounce(2 * t - 1)) / 2,
}

/**
 * Apply easing to a 0..1 progress value.
 * @param {string} easingName
 * @param {number} t — raw progress 0..1
 * @returns {number} eased progress 0..1
 */
export function ease(easingName, t) {
  const fn = EASING[easingName]
  return fn ? fn(Math.max(0, Math.min(1, t))) : t
}

export default { EASING, ease }
