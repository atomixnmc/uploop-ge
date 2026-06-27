/**
 * PhysicsWorld — Simple physics engine with gravity, integration,
 * collision detection, and impulse-based collision response.
 *
 * Usage:
 *   const world = createWorld({ gravity: vec3.set(vec3.create(), 0, -9.81, 0) })
 *   world.addBody(body, collider, transform)
 *   world.step(1/60)
 *
 * @depends @uploop/math
 */

import { vec3 } from '@uploop/math'
import { checkCollision } from './collision.js'

let _nextId = 1

/**
 * Create a physics world.
 * @param {{ gravity?: Vec3 }} [options]
 * @returns {Object} world
 */
export function createWorld({ gravity = null } = {}) {
  const _gravity = gravity ? vec3.clone(gravity) : vec3.set(vec3.create(), 0, -9.81, 0)
  const _entries = [] // { id, body, collider, transform }

  /** @type {function(*, *, *): void|null} */
  let _onCollision = null

  const world = {
    /** @returns {Vec3} */
    get gravity() { return _gravity },
    set gravity(v) { vec3.copy(_gravity, v) },

    /**
     * Add a body + collider pair to the simulation.
     * @param {import('./types.js').RigidBody} body
     * @param {import('./types.js').Collider} collider
     * @param {import('./types.js').ColliderTransform} transform — {position, rotation}
     */
    addBody(body, collider, transform) {
      const id = _nextId++
      _entries.push({ id, body, collider, transform })
    },

    /**
     * Remove a body from the simulation.
     * @param {import('./types.js').RigidBody} body
     */
    removeBody(body) {
      const idx = _entries.findIndex(e => e.body === body)
      if (idx >= 0) _entries.splice(idx, 1)
    },

    /**
     * Callback for collision events.
     * @param {function(import('./types.js').RigidBody, import('./types.js').RigidBody, import('./types.js').CollisionResult): void} fn
     */
    set onCollision(fn) {
      _onCollision = fn
    },

    /**
     * Advance the simulation by dt seconds.
     * 1. Integrate all bodies
     * 2. Detect collisions (narrow phase)
     * 3. Resolve collisions with impulse response
     * @param {number} dt
     */
    step(dt) {
      if (dt <= 0) return

      // Integration
      for (const entry of _entries) {
        entry.body.integrate(dt, _gravity, entry.transform)
      }

      // Collision detection & resolution
      const n = _entries.length
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = _entries[i]
          const b = _entries[j]
          if (a.body.isKinematic && b.body.isKinematic) continue

          const result = checkCollision(a.collider, a.transform, b.collider, b.transform)
          if (!result) continue

          if (_onCollision) {
            _onCollision(a.body, b.body, result)
          }

          resolveCollision(a.body, b.body, result)
        }
      }
    },
  }

  return world
}

/**
 * Impulse-based collision response with Coulomb friction.
 * @param {import('./types.js').RigidBody} bodyA
 * @param {import('./types.js').RigidBody} bodyB
 * @param {import('./types.js').CollisionResult} contact
 */
function resolveCollision(bodyA, bodyB, contact) {
  const { normal, depth } = contact

  // Relative velocity
  const rv = vec3.create()
  vec3.sub(rv, bodyB.velocity, bodyA.velocity)

  const velAlongNormal = vec3.dot(rv, normal)

  // Objects separating — no resolution needed
  if (velAlongNormal > 0) return

  const invMassA = bodyA.isKinematic ? 0 : 1 / bodyA.mass
  const invMassB = bodyB.isKinematic ? 0 : 1 / bodyB.mass
  const invMassSum = invMassA + invMassB
  if (invMassSum <= 0) return

  // Restitution (mixed)
  const e = Math.min(bodyA.restitution, bodyB.restitution)

  // Impulse magnitude
  let j = -(1 + e) * velAlongNormal / invMassSum

  // Positional correction (Baumgarte)
  const slop = 0.01
  const correction = Math.max(depth - slop, 0) * 0.4 / invMassSum
  j += correction

  // Normal impulse
  const impulse = vec3.create()
  vec3.scale(impulse, normal, j)

  // Apply impulse
  if (!bodyA.isKinematic) {
    vec3.scaleAndAdd(bodyA.velocity, bodyA.velocity, impulse, -invMassA)
  }
  if (!bodyB.isKinematic) {
    vec3.scaleAndAdd(bodyB.velocity, bodyB.velocity, impulse, invMassB)
  }

  // Friction (Coulomb)
  const tangent = vec3.create()
  vec3.scaleAndAdd(tangent, rv, normal, -velAlongNormal)
  const tangentLen = vec3.length(tangent)

  if (tangentLen > 1e-6) {
    vec3.scale(tangent, tangent, 1 / tangentLen)

    const frictionCoeff = Math.min(bodyA.friction, bodyB.friction)
    let jt = -vec3.dot(rv, tangent) / invMassSum
    jt = Math.max(-j * frictionCoeff, Math.min(j * frictionCoeff, jt))

    vec3.scale(tangent, tangent, jt)

    if (!bodyA.isKinematic) {
      vec3.scaleAndAdd(bodyA.velocity, bodyA.velocity, tangent, -invMassA)
    }
    if (!bodyB.isKinematic) {
      vec3.scaleAndAdd(bodyB.velocity, bodyB.velocity, tangent, invMassB)
    }
  }
}

export default { createWorld }
