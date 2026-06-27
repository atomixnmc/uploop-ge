/**
 * @typedef {'step'|'linear'|'cubic'} InterpolationMode
 *
 * @typedef {Object} Keyframe
 * @property {number} time    — position on the timeline (seconds)
 * @property {number|number[]} value — the value at this keyframe
 * @property {string} [easing] — easing function name (for cubic interpolation)
 *
 * @typedef {Object} Track
 * @property {string} targetPath      — e.g. "transform.position"
 * @property {Keyframe[]} keyframes   — sorted by time ascending
 * @property {InterpolationMode} interpolation
 *
 * @typedef {Object} KeyframeClipDescriptor
 * @property {string} name
 * @property {number} duration  — total clip length in seconds
 * @property {Track[]} tracks
 *
 * @typedef {Object} KeyframeClip
 * @property {string} name
 * @property {number} duration
 * @property {Track[]} tracks
 * @property {function(number): Object<string, *>} evaluate
 *
 * @typedef {Object} ActiveClip
 * @property {KeyframeClip} clip
 * @property {number} elapsed
 * @property {number} speed
 * @property {boolean} loop
 * @property {function(): void} [onComplete]
 *
 * @typedef {Object} PlayOptions
 * @property {boolean} [loop=false]
 * @property {number} [speed=1]
 * @property {function(): void} [onComplete]
 */

export default {}
