/**
 * @typedef {Object} RigidBodyDescriptor
 * @property {number} [mass=1]
 * @property {Vec3} [velocity]      — linear velocity
 * @property {Vec3} [angularVelocity]
 * @property {number} [friction=0.5]
 * @property {number} [restitution=0.3] — bounciness
 * @property {boolean} [isKinematic=false] — not affected by forces
 * @property {boolean} [useGravity=true]
 *
 * @typedef {Object} RigidBody
 * @property {number} mass
 * @property {Vec3} velocity
 * @property {Vec3} angularVelocity
 * @property {number} friction
 * @property {number} restitution
 * @property {boolean} isKinematic
 * @property {boolean} useGravity
 * @property {Vec3} force          — accumulated force (cleared each step)
 * @property {Vec3} torque         — accumulated torque (cleared each step)
 * @property {function(Vec3): void} applyForce
 * @property {function(Vec3): void} applyImpulse
 * @property {function(number, Vec3): void} integrate
 *
 * @typedef {'sphere'|'box'|'plane'} ColliderType
 *
 * @typedef {Object} SphereCollider
 * @property {'sphere'} type
 * @property {number} radius
 *
 * @typedef {Object} BoxCollider
 * @property {'box'} type
 * @property {Vec3} halfExtents
 *
 * @typedef {Object} PlaneCollider
 * @property {'plane'} type
 * @property {Vec3} normal
 * @property {number} distance
 *
 * @typedef {SphereCollider|BoxCollider|PlaneCollider} Collider
 *
 * @typedef {Object} CollisionResult
 * @property {boolean} colliding
 * @property {Vec3} normal
 * @property {number} depth
 * @property {Vec3} point
 *
 * @typedef {Object} ColliderTransform
 * @property {Vec3} position
 * @property {Quat} rotation
 */

export default {}
