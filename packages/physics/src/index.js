/**
 * @uploop/physics — Simple Physics Engine
 *
 * Rigid body dynamics with semi-implicit Euler integration,
 * sphere/box/plane colliders, SAT collision detection,
 * and impulse-based collision response with Coulomb friction.
 *
 * Usage:
 *   import { createWorld, createRigidBody, createSphereCollider } from '@uploop/physics'
 */

export { createWorld } from './world.js'
export { createRigidBody } from './rigidbody.js'
export { createSphereCollider, createBoxCollider, createPlaneCollider } from './collider.js'
export { checkCollision } from './collision.js'
