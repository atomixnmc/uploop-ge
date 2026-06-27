/**
 * BVH — Bounding Volume Hierarchy builder and traverser.
 *
 * The BVH is a HyperGraph acceleration structure: geometry nodes are
 * organized into an AABB tree for O(log n) ray intersection.
 *
 * @depends types.js, ray.js, @uploop/math
 */
import { vec3 } from '@uploop/math'
import { intersectAABB, intersectTriangle } from './ray.js'

/**
 * Build a BVH from triangle data.
 * Uses a simple SAH-inspired top-down builder.
 *
 * @param {Float32Array} positions — flat [x0,y0,z0, x1,y1,z1, ...]
 * @param {Float32Array} [normals] — per-vertex normals
 * @param {Uint16Array|Uint32Array} [indices] — triangle indices
 * @param {number} [maxTrianglesPerLeaf=4]
 * @returns {import('./types.js').BVHNode[]}
 */
export function buildBVH(positions, normals, indices, maxTrianglesPerLeaf = 4) {
  const triCount = indices ? indices.length / 3 : positions.length / 9
  const nodes = []

  // Create leaf triangles array
  const triangles = []
  for (let i = 0; i < triCount; i++) {
    const i0 = indices ? indices[i * 3] : i * 3
    const i1 = indices ? indices[i * 3 + 1] : i * 3 + 1
    const i2 = indices ? indices[i * 3 + 2] : i * 3 + 2
    triangles.push({
      v0: [positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]],
      v1: [positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]],
      v2: [positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]],
      n0: normals ? [normals[i0 * 3], normals[i0 * 3 + 1], normals[i0 * 3 + 2]] : [0, 1, 0],
      n1: normals ? [normals[i1 * 3], normals[i1 * 3 + 1], normals[i1 * 3 + 2]] : [0, 1, 0],
      n2: normals ? [normals[i2 * 3], normals[i2 * 3 + 1], normals[i2 * 3 + 2]] : [0, 1, 0],
      index: i,
    })
  }

  function computeBounds(triList, start, count) {
    const min = vec3.set(vec3.create(), Infinity, Infinity, Infinity)
    const max = vec3.set(vec3.create(), -Infinity, -Infinity, -Infinity)
    for (let i = start; i < start + count; i++) {
      const t = triList[i]
      for (const v of [t.v0, t.v1, t.v2]) {
        min[0] = Math.min(min[0], v[0]); min[1] = Math.min(min[1], v[1]); min[2] = Math.min(min[2], v[2])
        max[0] = Math.max(max[0], v[0]); max[1] = Math.max(max[1], v[1]); max[2] = Math.max(max[2], v[2])
      }
    }
    return { min, max, centroid: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2] }
  }

  function build(triList, start, count) {
    const { min, max, centroid } = computeBounds(triList, start, count)

    if (count <= maxTrianglesPerLeaf) {
      nodes.push({
        min, max,
        left: null, right: null,
        triangleStart: start,
        triangleCount: count,
      })
      return nodes.length - 1
    }

    // Split axis: longest extent
    const ext = [max[0] - min[0], max[1] - min[1], max[2] - max[2]]
    const axis = ext[0] >= ext[1] && ext[0] >= ext[2] ? 0 : ext[1] >= ext[2] ? 1 : 2

    // Sort triangles by centroid on split axis
    const segment = triList.slice(start, start + count)
    segment.sort((a, b) => {
      const ca = (a.v0[axis] + a.v1[axis] + a.v2[axis]) / 3
      const cb = (b.v0[axis] + b.v1[axis] + b.v2[axis]) / 3
      return ca - cb
    })
    for (let i = 0; i < segment.length; i++) {
      triList[start + i] = segment[i]
    }

    const mid = Math.floor(count / 2)
    const leftIdx = build(triList, start, mid)
    const rightIdx = build(triList, start + mid, count - mid)

    const nodeIdx = nodes.length
    nodes.push({
      min, max,
      left: leftIdx, right: rightIdx,
      triangleStart: 0, triangleCount: 0,
    })
    return nodeIdx
  }

  build(triangles, 0, triangles.length)

  return { nodes, triangles, rootIndex: nodes.length - 1 }
}

/**
 * Traverse BVH with a ray and find closest hit.
 * @param {import('./types.js').Ray} ray
 * @param {import('./types.js').BVHNode[]} nodes
 * @param {Object[]} triangles — array of { v0, v1, v2, n0, n1, n2, index }
 * @param {number} nodeIdx — current node index
 * @param {number} [entityIdx=-1]
 * @returns {import('./types.js').Hit}
 */
export function traverseBVH(ray, nodes, triangles, nodeIdx, entityIdx = -1) {
  const NO_HIT = { hit: false, t: Infinity, position: null, normal: null, material: null, entityIndex: entityIdx, triangleIndex: -1 }

  if (nodeIdx == null || nodeIdx < 0 || nodeIdx >= nodes.length) return NO_HIT

  const stack = [nodeIdx]
  let closestHit = NO_HIT

  while (stack.length > 0) {
    const idx = stack.pop()
    const node = nodes[idx]

    const tAABB = intersectAABB(ray, node.min, node.max, closestHit.t)
    if (tAABB < 0) continue

    if (node.left == null && node.right == null) {
      // Leaf: test triangles
      for (let i = node.triangleStart; i < node.triangleStart + node.triangleCount; i++) {
        const tri = triangles[i]
        const hit = intersectTriangle(ray,
          tri.v0, tri.v1, tri.v2,
          tri.n0, tri.n1, tri.n2,
        )
        if (hit.hit && hit.t < closestHit.t) {
          hit.triangleIndex = tri.index
          hit.entityIndex = entityIdx
          closestHit = hit
        }
      }
    } else {
      // Internal: push children (right first so left is tested first)
      if (node.right != null) stack.push(node.right)
      if (node.left != null) stack.push(node.left)
    }
  }

  return closestHit
}

export default { buildBVH, traverseBVH }
