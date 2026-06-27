/**
 * Constraints — Movement restrictions applied to behaviors.
 *
 * Constraints are HyperGraph edges: they connect behaviors to limits,
 * modifying the output in real-time.
 *
 * @depends types.js, @uploop/math
 */
import { vec3 } from '@uploop/math'

/**
 * Look-at constraint: always face a target point.
 * @param {Float32Array|number[]} target
 * @param {number} [weight=1] — blend weight (0 = no effect, 1 = full constraint)
 * @returns {Constraint}
 */
export function lookAt(target, weight = 1) {
  return {
    type: 'lookAt',
    params: { target: vec3.set(vec3.create(), ...target), weight },
  }
}

/**
 * Bounds constraint: clamp position to a box.
 * @param {Float32Array|number[]} min
 * @param {Float32Array|number[]} max
 * @returns {Constraint}
 */
export function bounds(min, max) {
  return {
    type: 'bounds',
    params: {
      min: vec3.set(vec3.create(), ...min),
      max: vec3.set(vec3.create(), ...max),
    },
  }
}

/**
 * Distance constraint: maintain min/max distance from target.
 * @param {Float32Array|number[]} target
 * @param {number} [min=0]
 * @param {number} [max=Infinity]
 * @returns {Constraint}
 */
export function distance(target, min = 0, max = Infinity) {
  return {
    type: 'distance',
    params: { target: vec3.set(vec3.create(), ...target), min, max },
  }
}

/**
 * Apply constraints to a position vector.
 * @param {Float32Array} position — mutated in place
 * @param {Constraint[]} constraints
 */
export function applyConstraints(position, constraints) {
  for (const c of constraints) {
    switch (c.type) {
      case 'bounds': {
        const { min, max } = c.params
        position[0] = Math.max(min[0], Math.min(max[0], position[0]))
        position[1] = Math.max(min[1], Math.min(max[1], position[1]))
        position[2] = Math.max(min[2], Math.min(max[2], position[2]))
        break
      }
      case 'distance': {
        const { target, min: dMin, max: dMax } = c.params
        const dx = position[0] - target[0]
        const dy = position[1] - target[1]
        const dz = position[2] - target[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < dMin && dist > 0.0001) {
          const s = dMin / dist
          position[0] = target[0] + dx * s
          position[1] = target[1] + dy * s
          position[2] = target[2] + dz * s
        } else if (dist > dMax) {
          const s = dMax / dist
          position[0] = target[0] + dx * s
          position[1] = target[1] + dy * s
          position[2] = target[2] + dz * s
        }
        break
      }
    }
  }
}

export default { lookAt, bounds, distance, applyConstraints }
