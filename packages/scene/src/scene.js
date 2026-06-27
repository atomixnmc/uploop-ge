/**
 * Scene — Container for entities, cameras, and lights.
 *
 * Provides add/remove operations, query by tag/type, and traversal.
 * Designed to be used with createGameLoop for rendering.
 *
 * @depends @uploop/math
 */

import { Entity } from './entity.js'
import { PerspectiveCamera } from './camera.js'
import { AmbientLight } from './light.js'
import { aabb } from '@uploop/math'

/**
 * Create a scene.
 *
 * @param {Object} [config]
 * @param {string} [config.name='Scene']
 * @returns {Scene}
 */
export function createScene({ name = 'Scene' } = {}) {
  const _entities = new Map()
  const _cameras = []
  const _lights = []
  let _activeCamera = null
  let _entityList = [] // cached list for iteration

  const scene = {
    name,

    // --- Entities ---

    /** Add an entity to the scene */
    add(entity) {
      _entities.set(entity.id, entity)
      _entityList = [..._entities.values()]
      return entity
    },

    /** Remove an entity by ID or reference */
    remove(entityOrId) {
      const id = typeof entityOrId === 'string' ? entityOrId : entityOrId.id
      _entities.delete(id)
      _entityList = [..._entities.values()]
    },

    /** Get entity by ID */
    get(id) {
      return _entities.get(id)
    },

    /** Get all entities */
    get entities() {
      return _entityList
    },

    /** Query entities by tag */
    queryTag(tag) {
      return _entityList.filter(e => e.hasTag(tag))
    },

    /** Query entities by component name */
    queryComponent(name) {
      return _entityList.filter(e => e.hasComponent(name))
    },

    /** Get count of entities */
    get entityCount() {
      return _entities.size
    },

    /** Clear all entities */
    clear() {
      _entities.clear()
      _entityList = []
    },

    // --- Cameras ---

    addCamera(camera) {
      _cameras.push(camera)
      if (!_activeCamera) _activeCamera = camera
      return camera
    },

    removeCamera(camera) {
      const idx = _cameras.indexOf(camera)
      if (idx >= 0) _cameras.splice(idx, 1)
      if (_activeCamera === camera) _activeCamera = _cameras[0] || null
    },

    get cameras() { return _cameras },
    get activeCamera() { return _activeCamera },
    set activeCamera(cam) {
      if (_cameras.includes(cam)) _activeCamera = cam
    },

    // --- Lights ---

    addLight(light) {
      _lights.push(light)
      return light
    },

    removeLight(light) {
      const idx = _lights.indexOf(light)
      if (idx >= 0) _lights.splice(idx, 1)
    },

    get lights() { return _lights },

    /** Get all non-ambient lights */
    get dynamicLights() {
      return _lights.filter(l => l.type !== 'ambient')
    },

    /** Get ambient light (first found) */
    get ambientLight() {
      return _lights.find(l => l.type === 'ambient') || null
    },

    // --- Bounding ---

    /** Compute scene bounding box from all entity transforms */
    computeBBox() {
      const box = aabb.createAABB()
      for (const entity of _entityList) {
        if (!entity.visible) continue
        const pos = entity.transform.worldPosition
        aabb.encapsulatePoint(box, pos)
      }
      return aabb.isEmpty(box) ? null : box
    },

    /** Get all visible entities (for rendering) */
    get visibleEntities() {
      return _entityList.filter(e => e.visible)
    },
  }

  return scene
}

export default { createScene }
