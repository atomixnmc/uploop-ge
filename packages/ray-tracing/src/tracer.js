/**
 * Ray Tracer — Scene-level ray tracing with BVH acceleration.
 *
 * The RayTracer is a HyperGraph component. It holds a BVH of the scene
 * geometry and dispatches ray queries, returning hit results.
 *
 * @depends types.js, ray.js, bvh.js, pathtrace.js, @uploop/math
 */
import { vec3 } from '@uploop/math'
import { createRay, createCameraRay } from './ray.js'
import { buildBVH, traverseBVH } from './bvh.js'
import { pathTrace } from './pathtrace.js'

/**
 * Create a ray tracer from scene geometry.
 * @param {Object} opts
 * @param {Object[]} [opts.entities=[]] — { mesh: { vertices, indices }, material }
 * @param {Float32Array} [opts.positions] — flat vertex positions
 * @param {Float32Array} [opts.normals] — flat vertex normals
 * @param {Uint16Array|Uint32Array} [opts.indices] — triangle indices
 * @param {Object[]} [opts.materials=[]]
 * @param {number} [opts.maxDepth=4]
 * @param {number[]} [opts.skyColor=[0.5,0.7,0.9]]
 * @returns {import('./types.js').RayTracer}
 */
export function createRayTracer({
  entities = [],
  positions = null,
  normals = null,
  indices = null,
  materials = [],
  maxDepth = 4,
  skyColor = [0.5, 0.7, 0.9],
} = {}) {
  // Collect geometry from entities if no raw positions provided
  if (!positions && entities.length > 0) {
    const allPos = []
    const allNrm = []
    const allIdx = []
    const allMats = []
    let triOffset = 0

    for (let ei = 0; ei < entities.length; ei++) {
      const ent = entities[ei]
      if (!ent.mesh?.vertices) continue

      const mesh = ent.mesh
      const fmt = mesh.format
      const stride = fmt ? fmt.stride / 4 : 8

      for (let vi = 0; vi < mesh.vertices.length / stride; vi++) {
        const bo = vi * stride
        allPos.push(mesh.vertices[bo], mesh.vertices[bo + 1], mesh.vertices[bo + 2])
        allNrm.push(mesh.vertices[bo + 3] || 0, mesh.vertices[bo + 4] || 0, mesh.vertices[bo + 5] || 1)
      }

      if (mesh.indices) {
        for (const idx of mesh.indices) {
          allIdx.push(idx + triOffset)
        }
      } else {
        for (let i = 0; i < mesh.vertices.length / stride; i++) {
          allIdx.push(i + triOffset)
        }
      }

      allMats.push(ent.material || { albedo: [0.8, 0.8, 0.8], roughness: 0.5 })
      triOffset += mesh.vertices.length / stride
    }

    positions = new Float32Array(allPos)
    normals = new Float32Array(allNrm)
    indices = new Uint32Array(allIdx)
    materials = allMats
  }

  if (!positions || positions.length < 9) {
    // Empty scene
    const tracer = createEmptyTracer()
    tracer.skyColor = skyColor
    tracer.maxDepth = maxDepth
    return tracer
  }

  const bvh = buildBVH(positions, normals, new Uint32Array(indices || []), 4)
  const subscribers = []

  /** @type {import('./types.js').RayTracer} */
  const tracer = {
    nodes: bvh.nodes,
    triangles: bvh.triangles,
    rootIndex: bvh.rootIndex,
    materials,
    maxDepth,
    skyColor,

    /** Cast a single ray and return closest hit */
    trace(ray) {
      const hit = traverseBVH(ray, this.nodes, this.triangles, this.rootIndex)
      if (hit.hit && hit.triangleIndex >= 0 && hit.triangleIndex < materials.length) {
        hit.material = materials[hit.triangleIndex] || materials[0]
      }
      return hit
    },

    /** Check if any geometry exists between ray origin and point */
    shadowRay(ray, maxDist) {
      const shadowRay = createRay(ray.origin, ray.direction, ray.tMin, maxDist)
      const hit = traverseBVH(shadowRay, this.nodes, this.triangles, this.rootIndex)
      return hit.hit
    },

    /** Cast multiple rays and collect hits */
    traceBatch(rays) {
      return rays.map(r => this.trace(r))
    },

    /** Path trace a single ray */
    pathTrace(ray) {
      return pathTrace(ray, this, 0)
    },

    /** Cast camera rays for a full frame */
    renderFrame(camera, width, height, samples = 1) {
      const pixels = new Float32Array(width * height * 3)
      const aspect = width / height

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const color = vec3.create()
          for (let s = 0; s < samples; s++) {
            const sx = x + Math.random()
            const sy = y + Math.random()
            const ray = createCameraRay(
              camera.position, camera.target, camera.up,
              camera.fov, aspect, sx, sy, width, height,
            )
            const sample = this.pathTrace(ray)
            color[0] += sample[0]; color[1] += sample[1]; color[2] += sample[2]
          }
          const idx = (y * width + x) * 3
          pixels[idx] = color[0] / samples
          pixels[idx + 1] = color[1] / samples
          pixels[idx + 2] = color[2] / samples
        }
      }
      return pixels
    },

    /** Update scene geometry (rebuild BVH) */
    updateGeometry(newPositions, newNormals, newIndices) {
      const bvh = buildBVH(newPositions, newNormals, new Uint32Array(newIndices || []), 4)
      this.nodes = bvh.nodes
      this.triangles = bvh.triangles
      this.rootIndex = bvh.rootIndex
      notify()
    },

    /** Subscribe to tracer state */
    subscribe(fn) {
      subscribers.push(fn)
      return () => {
        const i = subscribers.indexOf(fn)
        if (i >= 0) subscribers.splice(i, 1)
      }
    },

    /** HyperGraph manifest */
    describe() {
      return {
        kind: 'uploop.raytracer',
        name: 'RayTracer',
        nodes: [
          { id: 'raytracer.bvh', kind: 'BVH', nodeCount: this.nodes.length },
          { id: 'raytracer.triangles', kind: 'geometry', count: this.triangles.length },
          { id: 'raytracer.materials', kind: 'materials', count: this.materials.length },
        ],
        edges: [
          { from: 'raytracer.bvh', to: 'raytracer.triangles', kind: 'references' },
          { from: 'raytracer.triangles', to: 'raytracer.materials', kind: 'uses' },
        ],
      }
    },
  }

  function notify() {
    for (const sub of subscribers) sub(tracer)
  }

  return tracer
}

function createEmptyTracer() {
  const subscribers = []
  return {
    nodes: [], triangles: [], rootIndex: -1, materials: [], maxDepth: 1, skyColor: [0, 0, 0],
    trace() { return { hit: false, t: Infinity, position: null, normal: null, material: null, entityIndex: -1, triangleIndex: -1 } },
    shadowRay() { return false },
    traceBatch(rays) { return rays.map(() => ({ hit: false, t: Infinity })) },
    pathTrace() { return vec3.create() },
    renderFrame() { return new Float32Array(0) },
    updateGeometry() {},
    subscribe(fn) { subscribers.push(fn); return () => { const i = subscribers.indexOf(fn); if (i >= 0) subscribers.splice(i, 1) } },
    describe() { return { kind: 'uploop.raytracer', name: 'RayTracer', nodes: [], edges: [] } },
  }
}

export default { createRayTracer }
