/**
 * BVH — Bounding Volume Hierarchy for spatial queries on triangle meshes.
 *
 * A BVH accelerates ray intersection tests (raycasting/picking) and
 * frustum culling by organizing triangles into a tree of AABBs.
 *
 * Build strategy: simple median-split on longest axis (SAH-quality BVH
 * would require more complex heuristics but this is fast and decent).
 */

import { vec3 } from '@uploop/math'

/**
 * Build a BVH from mesh positions and indices.
 *
 * @param {Float32Array} positions — flat array of vec3 positions
 * @param {Uint16Array|Uint32Array} indices — triangle indices (3 per triangle)
 * @returns {BVHNode} root node
 */
export function buildBVH(positions, indices) {
  const triCount = Math.floor(indices.length / 3)

  // Build triangle data: [minX, minY, minZ, maxX, maxY, maxZ, centroidX, centroidY, centroidZ]
  const triData = new Float32Array(triCount * 9)
  const triIndices = new Uint32Array(triCount)

  for (let t = 0; t < triCount; t++) {
    const i0 = indices[t * 3] * 3
    const i1 = indices[t * 3 + 1] * 3
    const i2 = indices[t * 3 + 2] * 3
    const x0 = positions[i0], y0 = positions[i0+1], z0 = positions[i0+2]
    const x1 = positions[i1], y1 = positions[i1+1], z1 = positions[i1+2]
    const x2 = positions[i2], y2 = positions[i2+1], z2 = positions[i2+2]

    const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2)
    const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2)
    const minZ = Math.min(z0, z1, z2), maxZ = Math.max(z0, z1, z2)

    const off = t * 9
    triData[off]     = minX
    triData[off + 1] = minY
    triData[off + 2] = minZ
    triData[off + 3] = maxX
    triData[off + 4] = maxY
    triData[off + 5] = maxZ
    triData[off + 6] = (minX + maxX) * 0.5
    triData[off + 7] = (minY + maxY) * 0.5
    triData[off + 8] = (minZ + maxZ) * 0.5
    triIndices[t] = t
  }

  return _buildRecursive(triData, triIndices, 0, triCount - 1, 0)
}

const LEAF_MAX = 8 // max triangles per leaf

function _buildRecursive(triData, triIndices, start, end, depth) {
  const count = end - start + 1

  // Compute bbox for this range
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let k = start; k <= end; k++) {
    const off = triIndices[k] * 9
    minX = Math.min(minX, triData[off])
    minY = Math.min(minY, triData[off + 1])
    minZ = Math.min(minZ, triData[off + 2])
    maxX = Math.max(maxX, triData[off + 3])
    maxY = Math.max(maxY, triData[off + 4])
    maxZ = Math.max(maxZ, triData[off + 5])
  }

  // Leaf node
  if (count <= LEAF_MAX || depth > 32) {
    const tris = []
    for (let k = start; k <= end; k++) {
      tris.push(triIndices[k])
    }
    return {
      box: { min: vec3.create(minX, minY, minZ), max: vec3.create(maxX, maxY, maxZ) },
      left: null,
      right: null,
      triangleIndices: tris,
    }
  }

  // Split on longest axis
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ
  let axis
  if (dx >= dy && dx >= dz) axis = 0
  else if (dy >= dx && dy >= dz) axis = 1
  else axis = 2

  // Sort triangles by centroid on split axis
  const centroids = []
  for (let k = start; k <= end; k++) {
    centroids.push({ idx: triIndices[k], centroid: triData[triIndices[k] * 9 + 6 + axis] })
  }
  centroids.sort((a, b) => a.centroid - b.centroid)

  // Write back sorted
  for (let k = 0; k < centroids.length; k++) {
    triIndices[start + k] = centroids[k].idx
  }

  const mid = start + Math.floor(count / 2)

  return {
    box: { min: vec3.create(minX, minY, minZ), max: vec3.create(maxX, maxY, maxZ) },
    left: _buildRecursive(triData, triIndices, start, mid - 1, depth + 1),
    right: _buildRecursive(triData, triIndices, mid, end, depth + 1),
    triangleIndices: null,
  }
}

/**
 * Query BVH with a ray. Returns array of { triangleIndex, distance } hits.
 *
 * @param {BVHNode} node
 * @param {Ray} ray
 * @param {Float32Array} positions
 * @param {Uint16Array|Uint32Array} indices
 * @returns {Array<{triangleIndex: number, distance: number}>}
 */
export function rayQuery(node, ray, positions, indices) {
  const hits = []
  _rayQueryNode(node, ray, positions, indices, hits)
  hits.sort((a, b) => a.distance - b.distance)
  return hits
}

function _rayQueryNode(node, ray, positions, indices, hits) {
  if (!node) return

  // AABB test
  if (!_intersectAABB(ray, node.box)) return

  // Leaf
  if (node.triangleIndices) {
    for (const triIdx of node.triangleIndices) {
      const i0 = indices[triIdx * 3] * 3
      const i1 = indices[triIdx * 3 + 1] * 3
      const i2 = indices[triIdx * 3 + 2] * 3
      const v0 = vec3.create(positions[i0], positions[i0+1], positions[i0+2])
      const v1 = vec3.create(positions[i1], positions[i1+1], positions[i1+2])
      const v2 = vec3.create(positions[i2], positions[i2+1], positions[i2+2])
      const t = _intersectTriangle(ray, v0, v1, v2)
      if (t !== null) {
        hits.push({ triangleIndex: triIdx, distance: t })
      }
    }
    return
  }

  _rayQueryNode(node.left, ray, positions, indices, hits)
  _rayQueryNode(node.right, ray, positions, indices, hits)
}

function _intersectAABB(ray, box) {
  const { min, max } = box
  let tmin = -Infinity, tmax = Infinity
  for (let i = 0; i < 3; i++) {
    if (Math.abs(ray.direction[i]) < 1e-8) {
      if (ray.origin[i] < min[i] || ray.origin[i] > max[i]) return false
      continue
    }
    const invD = 1 / ray.direction[i]
    let t1 = (min[i] - ray.origin[i]) * invD
    let t2 = (max[i] - ray.origin[i]) * invD
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp }
    tmin = Math.max(tmin, t1)
    tmax = Math.min(tmax, t2)
    if (tmin > tmax) return false
  }
  return tmax >= 0
}

function _intersectTriangle(ray, v0, v1, v2) {
  const e1x = v1[0]-v0[0], e1y = v1[1]-v0[1], e1z = v1[2]-v0[2]
  const e2x = v2[0]-v0[0], e2y = v2[1]-v0[1], e2z = v2[2]-v0[2]
  const hx = ray.direction[1]*e2z - ray.direction[2]*e2y
  const hy = ray.direction[2]*e2x - ray.direction[0]*e2z
  const hz = ray.direction[0]*e2y - ray.direction[1]*e2x
  const a = e1x*hx + e1y*hy + e1z*hz
  if (Math.abs(a) < 1e-8) return null
  const f = 1 / a
  const sx = ray.origin[0]-v0[0], sy = ray.origin[1]-v0[1], sz = ray.origin[2]-v0[2]
  const u = f * (sx*hx + sy*hy + sz*hz)
  if (u < 0 || u > 1) return null
  const qx = sy*e1z - sz*e1y, qy = sz*e1x - sx*e1z, qz = sx*e1y - sy*e1x
  const v = f * (ray.direction[0]*qx + ray.direction[1]*qy + ray.direction[2]*qz)
  if (v < 0 || u + v > 1) return null
  const t = f * (e2x*qx + e2y*qy + e2z*qz)
  return t >= 1e-8 ? t : null
}

/**
 * Compute the total number of nodes in a BVH.
 * @param {BVHNode} node
 * @returns {number}
 */
export function nodeCount(node) {
  if (!node) return 0
  return 1 + nodeCount(node.left) + nodeCount(node.right)
}

/**
 * Compute max depth of a BVH.
 * @param {BVHNode} node
 * @returns {number}
 */
export function maxDepth(node) {
  if (!node) return 0
  if (!node.left && !node.right) return 1
  return 1 + Math.max(maxDepth(node.left), maxDepth(node.right))
}

export default { buildBVH, rayQuery, nodeCount, maxDepth }
