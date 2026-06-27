/**
 * @uploop/ray-tracing — Software ray tracing with BVH acceleration.
 *
 * Build acceleration structures from scene geometry, cast rays, trace
 * paths for photorealistic rendering. Every component is a HyperGraph node.
 *
 * Usage:
 *   import { createRayTracer, createRay, buildBVH } from '@uploop/ray-tracing'
 *
 *   const tracer = createRayTracer({ entities: scene.entities })
 *   const ray = createRay([0,0,0], [0,0,-1])
 *   const hit = tracer.trace(ray)
 *   console.log(tracer.describe())
 */

export { createRayTracer } from './tracer.js'
export { createRay, createCameraRay, intersectAABB, intersectTriangle } from './ray.js'
export { buildBVH, traverseBVH } from './bvh.js'
export { pathTrace } from './pathtrace.js'
