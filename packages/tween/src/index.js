/**
 * @uploop/tween — Tween System
 *
 * Property-based tweening with easing, delay, yoyo, repeat.
 * Managed via TweenManager for batch updates.
 *
 * Usage:
 *   import { createTween, createTweenManager } from '@uploop/tween'
 *   const tween = createTween(sprite, { from: {x: 0}, to: {x: 100}, duration: 1 })
 */

export { createTween } from './tween.js'
export { createTweenManager } from './tweens.js'
