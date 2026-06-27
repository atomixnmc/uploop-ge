/**
 * Path Tracer — Monte Carlo path tracing integrator.
 *
 * Traces rays through the scene with multiple bounces, accumulating
 * indirect lighting for photorealistic rendering.
 *
 * @depends types.js, ray.js, bvh.js, @uploop/math
 */
import { vec3 } from '@uploop/math'
import { createRay } from './ray.js'
import { traverseBVH } from './bvh.js'

/**
 * Path trace a single ray through the scene.
 * @param {import('./types.js').Ray} ray
 * @param {Object} tracer — { nodes, triangles, materials[], maxDepth }
 * @param {number} [depth=0]
 * @param {Float32Array} [accumulated] — output color accumulator
 * @returns {Float32Array} color
 */
export function pathTrace(ray, tracer, depth = 0, accumulated) {
  const color = accumulated || vec3.create()
  const throughput = vec3.set(vec3.create(), 1, 1, 1)

  let currentRay = ray
  let currentDepth = depth

  while (currentDepth < (tracer.maxDepth || 4)) {
    // Find closest hit
    const hit = traverseBVH(currentRay, tracer.nodes, tracer.triangles, tracer.rootIndex)

    if (!hit.hit) {
      // Sky/environment color
      const skyColor = tracer.skyColor || vec3.set(vec3.create(), 0.5, 0.7, 0.9)
      color[0] += throughput[0] * skyColor[0]
      color[1] += throughput[1] * skyColor[1]
      color[2] += throughput[2] * skyColor[2]
      break
    }

    // Get material
    const mat = hit.material || { albedo: [0.8, 0.8, 0.8], roughness: 0.5, emission: [0, 0, 0] }

    // Emission
    if (mat.emission) {
      color[0] += throughput[0] * mat.emission[0]
      color[1] += throughput[1] * mat.emission[1]
      color[2] += throughput[2] * mat.emission[2]
    }

    // Diffuse bounce: cosine-weighted hemisphere sampling
    const albedo = mat.albedo || [0.8, 0.8, 0.8]

    // Simple russian roulette termination
    if (currentDepth > 2) {
      const p = Math.max(albedo[0], albedo[1], albedo[2]) * 0.8
      if (Math.random() > p) break
      throughput[0] /= p; throughput[1] /= p; throughput[2] /= p
    }

    // Cosine-weighted hemisphere sample around normal
    const r1 = Math.random()
    const r2 = Math.random()
    const phi = 2 * Math.PI * r1
    const cosTheta = Math.sqrt(1 - r2)
    const sinTheta = Math.sqrt(r2)

    // Build orthonormal basis around normal
    const n = hit.normal
    const up = Math.abs(n[1]) < 0.999 ? [0, 1, 0] : [1, 0, 0]
    const tangent = vec3.create()
    vec3.cross(tangent, up, n)
    vec3.normalize(tangent, tangent)
    const bitangent = vec3.create()
    vec3.cross(bitangent, n, tangent)

    const dir = vec3.create()
    dir[0] = tangent[0] * cosTheta * Math.cos(phi) + n[0] * sinTheta + bitangent[0] * cosTheta * Math.sin(phi)
    dir[1] = tangent[1] * cosTheta * Math.cos(phi) + n[1] * sinTheta + bitangent[1] * cosTheta * Math.sin(phi)
    dir[2] = tangent[2] * cosTheta * Math.cos(phi) + n[2] * sinTheta + bitangent[2] * cosTheta * Math.sin(phi)
    vec3.normalize(dir, dir)

    // Reflect throughput
    const ndotl = Math.max(0, vec3.dot(n, dir))
    throughput[0] *= albedo[0] * ndotl
    throughput[1] *= albedo[1] * ndotl
    throughput[2] *= albedo[2] * ndotl

    // New ray from hit point with offset
    const newOrigin = vec3.create()
    newOrigin[0] = hit.position[0] + n[0] * 0.001
    newOrigin[1] = hit.position[1] + n[1] * 0.001
    newOrigin[2] = hit.position[2] + n[2] * 0.001

    currentRay = createRay(newOrigin, dir)
    currentDepth++
  }

  return color
}

export default { pathTrace }
