/**
 * Interpolate — Interpolation & Easing Functions
 *
 * All t parameters are 0..1. Easing functions remap t.
 */

/**
 * Linear interpolation: a + t * (b - a)
 */
export function lerp(a, b, t) {
  return a + t * (b - a)
}

/**
 * Spherical linear interpolation between two angles (radians)
 * Takes the shortest path.
 */
export function slerp(a, b, t) {
  let diff = b - a
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}

/**
 * Smooth Hermite interpolation: 3t² - 2t³
 */
export function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

/**
 * Smoother step (5th order): 6t⁵ - 15t⁴ + 10t³
 */
export function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

// --- Standard Easing (based on Robert Penner's equations) ---

export function easeInQuad(t) { return t * t }
export function easeOutQuad(t) { return t * (2 - t) }
export function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

export function easeInCubic(t) { return t * t * t }
export function easeOutCubic(t) { return (--t) * t * t + 1 }
export function easeInOutCubic(t) { return t < 0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 }

export function easeInQuart(t) { return t * t * t * t }
export function easeOutQuart(t) { return 1 - (--t) * t * t * t }
export function easeInOutQuart(t) { return t < 0.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t }

export function easeInQuint(t) { return t * t * t * t * t }
export function easeOutQuint(t) { return 1 + (--t) * t * t * t * t }
export function easeInOutQuint(t) { return t < 0.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }

export function easeInSine(t) { return 1 - Math.cos(t * Math.PI / 2) }
export function easeOutSine(t) { return Math.sin(t * Math.PI / 2) }
export function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2 }

export function easeInExpo(t) { return t === 0 ? 0 : Math.pow(2, 10 * (t - 1)) }
export function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
export function easeInOutExpo(t) {
  if (t === 0) return 0
  if (t === 1) return 1
  return t < 0.5 ? Math.pow(2, 20*t-10)/2 : (2-Math.pow(2, -20*t+10))/2
}

export function easeInCirc(t) { return 1 - Math.sqrt(1 - t * t) }
export function easeOutCirc(t) { return Math.sqrt(1 - (--t) * t) }
export function easeInOutCirc(t) {
  return t < 0.5 ? (1-Math.sqrt(1-4*t*t))/2 : (Math.sqrt(1-(-2*t+2)*(-2*t+2))+1)/2
}

export function easeInBack(t) { const c = 1.70158; return (c+1)*t*t*t - c*t*t }
export function easeOutBack(t) { const c = 1.70158; return 1 + (c+1)*Math.pow(t-1,3) + c*Math.pow(t-1,2) }
export function easeInOutBack(t) {
  const c = 1.70158 * 1.525
  return t < 0.5 ? (Math.pow(2*t,2)*((c+1)*2*t-c))/2 : (Math.pow(2*t-2,2)*((c+1)*(t*2-2)+c)+2)/2
}

export function easeInElastic(t) {
  if (t === 0) return 0
  if (t === 1) return 1
  return -Math.pow(2, 10*(t-1)) * Math.sin((t-1.075)*(2*Math.PI)/0.3)
}
export function easeOutElastic(t) {
  if (t === 0) return 0
  if (t === 1) return 1
  return Math.pow(2, -10*t) * Math.sin((t-0.075)*(2*Math.PI)/0.3) + 1
}
export function easeInOutElastic(t) {
  if (t === 0) return 0
  if (t === 1) return 1
  return t < 0.5
    ? -(Math.pow(2, 20*t-10) * Math.sin((20*t-11.125)*(2*Math.PI)/4.5)) / 2
    : (Math.pow(2, -20*t+10) * Math.sin((20*t-11.125)*(2*Math.PI)/4.5)) / 2 + 1
}

export function easeInBounce(t) { return 1 - easeOutBounce(1 - t) }
export function easeOutBounce(t) {
  const n1 = 7.5625, d1 = 2.75
  if (t < 1/d1) return n1*t*t
  if (t < 2/d1) return n1*(t-=1.5/d1)*t + 0.75
  if (t < 2.5/d1) return n1*(t-=2.25/d1)*t + 0.9375
  return n1*(t-=2.625/d1)*t + 0.984375
}
export function easeInOutBounce(t) {
  return t < 0.5 ? (1 - easeOutBounce(1-2*t)) / 2 : (1 + easeOutBounce(2*t-1)) / 2
}

// --- Interpolation between arrays/components ---

/** Lerp between two arrays component-wise */
export function lerpArray(out, a, b, t, n = a.length) {
  for (let i = 0; i < n; i++) out[i] = a[i] + t * (b[i] - a[i])
  return out
}

/** Map value from one range to another */
export function remap(value, inMin, inMax, outMin, outMax, clamp = false) {
  let t = (value - inMin) / (inMax - inMin)
  if (clamp) t = Math.max(0, Math.min(1, t))
  return outMin + t * (outMax - outMin)
}

/** Clamp value to [min, max] */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/** Wrap value to [0, 1] (fractional part) */
export function fract(value) {
  return value - Math.floor(value)
}

// --- Lookup table for easing by name ---

const easingFns = {
  linear: t => t,
  smoothstep,
  smootherstep,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInQuint, easeOutQuint, easeInOutQuint,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInBack, easeOutBack, easeInOutBack,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBounce, easeOutBounce, easeInOutBounce,
}

/**
 * Get easing function by name
 * @param {EasingFn|string} name
 * @returns {function(number): number}
 */
export function getEasing(name) {
  if (typeof name === 'function') return name
  return easingFns[name] || easingFns.linear
}

export default { lerp, slerp, smoothstep, smootherstep, easingFns, getEasing,
  lerpArray, remap, clamp, fract,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInQuint, easeOutQuint, easeInOutQuint,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInBack, easeOutBack, easeInOutBack,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBounce, easeOutBounce, easeInOutBounce }
