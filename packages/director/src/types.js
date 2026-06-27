/**
 * @uploop/director — Types
 *
 * @typedef {Object} Behavior
 * @property {string} id
 * @property {string} type — 'dolly'|'orbit'|'track'|'pan'|'crane'|'lookAt'|'followPath'
 * @property {number} progress — 0..1
 * @property {number} duration — seconds
 * @property {number} elapsed
 * @property {string} easing
 * @property {Object} params
 * @property {'waiting'|'running'|'done'} status
 *
 * @typedef {Object} Constraint
 * @property {string} type — 'lookAt'|'bounds'|'path'|'distance'
 * @property {Object} params
 *
 * @typedef {Object} Timeline
 * @property {Behavior[]} behaviors
 * @property {number} currentIndex
 * @property {boolean} loop
 *
 * @typedef {Object} DirectorState
 * @property {Behavior[]} queue
 * @property {Behavior|null} active
 * @property {Constraint[]} constraints
 * @property {Float32Array} cameraPosition
 * @property {Float32Array} cameraTarget
 * @property {Float32Array} cameraUp
 * @property {number} fov
 */
