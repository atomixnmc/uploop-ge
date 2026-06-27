/**
 * Entity — An object in the scene with a transform, optional mesh and material,
 * and arbitrary components (tags, behaviours, physics body, etc.).
 *
 * Entities are the basic building blocks of the scene graph.
 */

import { Transform } from './transform.js'

let _nextId = 1

/**
 * @param {EntityConfig} config
 * @returns {Entity}
 */
export function Entity({
  id,
  name = '',
  transform,
  meshId = null,
  materialId = null,
  visible = true,
  components = {},
  tags = [],
} = {}) {
  const entity = {
    id: id || `entity_${_nextId++}`,
    name,
    transform: transform || Transform(),
    meshId,
    materialId,
    visible,
    components: { ...components },
    tags: [...tags],

    /** Check if entity has a tag */
    hasTag(tag) {
      return this.tags.includes(tag)
    },

    /** Add a tag */
    addTag(tag) {
      if (!this.tags.includes(tag)) this.tags.push(tag)
    },

    /** Remove a tag */
    removeTag(tag) {
      this.tags = this.tags.filter(t => t !== tag)
    },

    /** Get/set a component value */
    getComponent(name) {
      return this.components[name]
    },

    setComponent(name, value) {
      this.components[name] = value
    },

    /** Remove a component */
    removeComponent(name) {
      delete this.components[name]
    },

    /** Check if entity has a component */
    hasComponent(name) {
      return name in this.components
    },

    /** Clone (shallow — shares mesh/material refs, clones transform) */
    clone() {
      return Entity({
        name: this.name,
        transform: this.transform.clone(),
        meshId: this.meshId,
        materialId: this.materialId,
        visible: this.visible,
        components: { ...this.components },
        tags: [...this.tags],
      })
    },
  }

  return entity
}

export default { Entity }
