/**
 * @typedef {Object} TweenDescriptor
 * @property {Object<string, number>} from   — starting property values
 * @property {Object<string, number>} to     — ending property values
 * @property {number} duration               — seconds
 * @property {string} [easing='linear']      — easing function name
 * @property {function(Object): void} [onUpdate] — called each frame with current values
 * @property {function(): void} [onComplete]     — called when tween finishes (not on yoyo return)
 * @property {number} [delay=0]              — seconds before tween starts
 * @property {boolean} [yoyo=false]          — ping-pong: go from → to → from
 * @property {number} [repeat=0]             — extra repetitions after first play (0 = play once)
 *
 * @typedef {Object} Tween
 * @property {function(): void} start
 * @property {function(): void} stop
 * @property {function(number): void} update
 * @property {function(number): void} seek
 * @property {number} progress              — 0..1 (read-only, current progress)
 * @property {boolean} running
 */

export default {}
