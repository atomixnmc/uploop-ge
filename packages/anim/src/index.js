/**
 * @uploop/anim — Animation System
 *
 * Keyframe-based clip playback with step/linear/cubic interpolation.
 * Works standalone or coupled with @uploop/scene entities.
 *
 * Usage:
 *   import { createKeyframeClip, createAnimator, getEasing } from '@uploop/anim'
 */

export { createKeyframeClip } from './keyframe.js'
export { createAnimator } from './animator.js'
export {
  getEasing,
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
} from './easing.js'
