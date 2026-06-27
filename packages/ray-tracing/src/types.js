/**
 * @uploop/ray-tracing — Types
 *
 * @typedef {Object} Ray
 * @property {Float32Array} origin
 * @property {Float32Array} direction
 * @property {number} tMin
 * @property {number} tMax
 *
 * @typedef {Object} Hit
 * @property {boolean} hit
 * @property {number} t — distance along ray
 * @property {Float32Array} position
 * @property {Float32Array} normal
 * @property {Object} material
 * @property {number} entityIndex
 * @property {number} triangleIndex
 *
 * @typedef {Object} BVHNode
 * @property {Float32Array} min — AABB min
 * @property {Float32Array} max — AABB max
 * @property {number|null} left — left child index (or null if leaf)
 * @property {number|null} right — right child index
 * @property {number} triangleStart — first triangle index (for leaf)
 * @property {number} triangleCount — number of triangles (for leaf)
 *
 * @typedef {Object} RayTracer
 * @property {BVHNode[]} nodes
 * @property {Float32Array} triangles — flat [v0x, v0y, v0z, v1x, ..., n0x, n0y, n0z, ...]
 * @property {Object[]} materials
 * @property {number} maxDepth
 */
