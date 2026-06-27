/**
 * RigidBody — Physics body with mass, velocity, forces.
 *
 * Semi-implicit Euler integration: v ← v + a·dt, x ← x + v·dt.
 * Accumulated forces cleared after each integrate() call.
 *
 * @depends @uploop/math
 */

import { vec3 } from '@uploop/math'

/**
 * Create a rigid body.
 * @param {import('./types.js').RigidBodyDescriptor} [desc]
 * @returns {import('./types.js').RigidBody}
 */
export function createRigidBody({
  mass = 1,
  velocity = null,
  angularVelocity = null,
  friction = 0.5,
  restitution = 0.3,
  isKinematic = false,
  useGravity = true,
} = {}) {
  const _force = vec3.create()
  const _torque = vec3.create()

  return {
    mass: Math.max(0.0001, mass),
    velocity: velocity ? vec3.clone(velocity) : vec3.create(),
    angularVelocity: angularVelocity ? vec3.clone(angularVelocity) : vec3.create(),
    friction,
    restitution,
    isKinematic,
    useGravity,

    force: _force,
    torque: _torque,

    /**
     * Accumulate a force. Cleared each integrate().
     * @param {Vec3} force
     */
    applyForce(force) {
      if (this.isKinematic) return
      vec3.add(_force, _force, force)
    },

    /**
     * Apply an instantaneous impulse (adds directly to velocity).
     * @param {Vec3} impulse
     */
    applyImpulse(impulse) {
      if (this.isKinematic || this.mass <= 0) return
      // dv = impulse / mass
      vec3.scaleAndAdd(this.velocity, this.velocity, impulse, 1 / this.mass)
    },

    /**
     * Semi-implicit Euler integration.
     * Updates velocity then position on the provided transform.
     * @param {number} dt — timestep in seconds
     * @param {Vec3} [gravity] — gravity vector (applied if useGravity)
     * @param {import('./types.js').ColliderTransform} transform — mutated in place
     */
    integrate(dt, gravity = null, transform) {
      if (this.isKinematic) return

      const invMass = 1 / this.mass

      // Apply gravity
      if (this.useGravity && gravity) {
        vec3.scaleAndAdd(this.velocity, this.velocity, gravity, dt)
      }

      // Apply accumulated forces
      vec3.scaleAndAdd(this.velocity, this.velocity, _force, invMass * dt)

      // Apply angular velocity (as incremental rotation about each axis)
      vec3.scaleAndAdd(this.angularVelocity, this.angularVelocity, _torque, invMass * dt)

      // Update position: x += v * dt
      if (transform) {
        vec3.scaleAndAdd(transform.position, transform.position, this.velocity, dt)
      }

      // Damping (simple friction)
      const damp = 1 - Math.min(this.friction * dt, 1)
      vec3.scale(this.velocity, this.velocity, damp)
      vec3.scale(this.angularVelocity, this.angularVelocity, damp)

      // Clear accumulated forces
      vec3.set(_force, 0, 0, 0)
      vec3.set(_torque, 0, 0, 0)
    },
  }
}

export default { createRigidBody }
