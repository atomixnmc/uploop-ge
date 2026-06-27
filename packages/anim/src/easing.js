/**
 * Easing — Re-export easing functions from @uploop/math/interpolate
 * and provide a friendly name lookup.
 *
 * @depends @uploop/math
 */

import { getEasing } from '@uploop/math/interpolate'

// Re-export all easing functions for convenience
export {
  lerp, slerp, smoothstep, smootherstep,
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
} from '@uploop/math/interpolate'

export { getEasing }
