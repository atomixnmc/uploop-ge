/**
 * @typedef {Object} GameLoopConfig
 * @property {Object} [state] — initial state (becomes HyperGraph data nodes)
 * @property {Object} [update] — update handlers (fixed timestep)
 * @property {Function} [render] — render(state, alpha) callback (display refresh)
 * @property {number} [fixedTimestep=1/60] — seconds per fixed update
 * @property {number} [maxFrameBudget=16] — ms before dropping frames
 * @property {boolean} [interpolation=true] — interpolate between fixed steps
 * @property {Object} [systems] — built-in system config
 * @property {'frustum'|'none'} [systems.culling='frustum']
 * @property {'painters'|'depth'|'none'} [systems.sorting='painters']
 * @property {boolean} [systems.batching=true]
 *
 * @typedef {Object} Entity
 * @property {string} id
 * @property {Transform} transform
 * @property {string|null} meshId
 * @property {string|null} materialId
 * @property {Object<string, *>} components
 *
 * @typedef {Object} Transform
 * @property {Vec3} position
 * @property {Quat} rotation
 * @property {Vec3} scale
 * @property {Transform|null} parent
 * @property {Transform[]} children
 *
 * @typedef {Object} Camera
 * @property {Transform} transform
 * @property {number} near
 * @property {number} far
 * @property {Mat4} viewMatrix
 * @property {Mat4} projectionMatrix
 * @property {Plane[]} frustumPlanes
 */

export default {}
