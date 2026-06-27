// AssemblyScript entry for wams-bvh
// BVH node layout (32 bytes):
//   [0-11]  aabb min (3 × f32)
//   [12-23] aabb max (3 × f32)
//   [24-27] left child index (i32, -1 = leaf)
//   [28-31] triangle start (i32) or right child index

// Triangle layout (9 × f32 = 36 bytes):
//   [0-8] v0, v1, v2 (3 × vec3)

// ── BVH Build (simple top-down, split on longest axis) ───────────

const NODE_SIZE: i32 = 32
const TRI_SIZE: i32 = 36

// Internal: compute AABB for triangle range
function computeBounds(triangles: usize, start: i32, count: i32, outMin: usize, outMax: usize): void {
  store<f32>(outMin,      1e30); store<f32>(outMin + 4,  1e30); store<f32>(outMin + 8,  1e30)
  store<f32>(outMax,     -1e30); store<f32>(outMax + 4, -1e30); store<f32>(outMax + 8, -1e30)

  for (let i: i32 = start; i < start + count; i++) {
    const tBase: usize = triangles + i * TRI_SIZE
    for (let v: i32 = 0; v < 3; v++) {
      const vBase: usize = tBase + v * 12
      const x = load<f32>(vBase)
      const y = load<f32>(vBase + 4)
      const z = load<f32>(vBase + 8)
      if (x < load<f32>(outMin))       store<f32>(outMin,      x)
      if (y < load<f32>(outMin + 4))   store<f32>(outMin + 4,  y)
      if (z < load<f32>(outMin + 8))   store<f32>(outMin + 8,  z)
      if (x > load<f32>(outMax))       store<f32>(outMax,      x)
      if (y > load<f32>(outMax + 4))   store<f32>(outMax + 4,  y)
      if (z > load<f32>(outMax + 8))   store<f32>(outMax + 8,  z)
    }
  }
}

// Partition triangles by centroid on given axis (in-place swap)
function partition(triangles: usize, start: i32, count: i32, axis: i32, pivot: f32): i32 {
  let i: i32 = start
  let j: i32 = start + count - 1
  // Scratch buffer for swap (36 bytes)
  const scratch: usize = 0 // FIXME: alloc scratch — for now, simple counting partition
  // Count triangles left of pivot
  let leftCount: i32 = 0
  for (let k: i32 = start; k < start + count; k++) {
    const tBase: usize = triangles + k * TRI_SIZE
    const cx = (load<f32>(tBase) + load<f32>(tBase + 12) + load<f32>(tBase + 24)) / 3.0
    const cy = (load<f32>(tBase + 4) + load<f32>(tBase + 16) + load<f32>(tBase + 28)) / 3.0
    const cz = (load<f32>(tBase + 8) + load<f32>(tBase + 20) + load<f32>(tBase + 32)) / 3.0
    let center: f32 = cx
    if (axis == 1) { center = cy }
    else if (axis == 2) { center = cz }
    if (center < pivot) leftCount++
  }
  return leftCount
}

// Recursive BVH build (returns node index)
function buildRecursive(triangles: usize, nodes: usize, start: i32, count: i32, nodeIdx: i32, maxDepth: i32): i32 {
  if (count <= 4 || nodeIdx >= 4096) {
    // Leaf node
    const nBase: usize = nodes + nodeIdx * NODE_SIZE
    computeBounds(triangles, start, count, nBase, nBase + 12)
    store<i32>(nBase + 24, -1)             // left = -1 = leaf
    store<i32>(nBase + 28, start)          // triangle start
    return nodeIdx
  }

  const nBase: usize = nodes + nodeIdx * NODE_SIZE
  computeBounds(triangles, start, count, nBase, nBase + 12)

  // Find longest axis
  const ex: f32 = load<f32>(nBase + 12) - load<f32>(nBase)
  const ey: f32 = load<f32>(nBase + 16) - load<f32>(nBase + 4)
  const ez: f32 = load<f32>(nBase + 20) - load<f32>(nBase + 8)
  let axis: i32 = 0
  if (ey > ex && ey > ez) axis = 1
  else if (ez > ex) axis = 2

  // Find centroid median as split pivot
  const mid: f32 = (load<f32>(nBase + (axis < 2 ? axis * 4 : 8)) + load<f32>(nBase + 12 + (axis < 2 ? axis * 4 : 8))) * 0.5

  const leftCount = partition(triangles, start, count, axis, mid)
  if (leftCount == 0 || leftCount == count) {
    // Degenerate split — make leaf
    store<i32>(nBase + 24, -1)
    store<i32>(nBase + 28, start)
    return nodeIdx
  }

  const leftIdx = buildRecursive(triangles, nodes, start, leftCount, nodeIdx + 1, maxDepth)
  const rightIdx = buildRecursive(triangles, nodes, start + leftCount, count - leftCount, leftIdx + 1, maxDepth)

  store<i32>(nBase + 24, nodeIdx + 1)     // left child
  store<i32>(nBase + 28, rightIdx)        // right child

  return rightIdx
}

/** Build BVH: nodes must be pre-allocated (maxNodes × 32 bytes). Returns node count. */
export function bvhBuild(triangles: usize, triCount: i32, nodes: usize): i32 {
  return buildRecursive(triangles, nodes, 0, triCount, 0, 32)
}

// ── AABB-Ray intersection (slab method) ─────────────────────────

function intersectAABB(
  ox: f32, oy: f32, oz: f32,
  dx: f32, dy: f32, dz: f32,
  invDx: f32, invDy: f32, invDz: f32,
  minX: f32, minY: f32, minZ: f32,
  maxX: f32, maxY: f32, maxZ: f32,
  tMax: f32,
): bool {
  let t0: f32 = 0.001
  let t1: f32 = tMax

  // X slab
  let tx0: f32 = (minX - ox) * invDx
  let tx1: f32 = (maxX - ox) * invDx
  if (invDx < 0) { const tmp = tx0; tx0 = tx1; tx1 = tmp }
  if (tx0 > t0) t0 = tx0
  if (tx1 < t1) t1 = tx1
  if (t0 > t1) return false

  // Y slab
  let ty0: f32 = (minY - oy) * invDy
  let ty1: f32 = (maxY - oy) * invDy
  if (invDy < 0) { const tmp = ty0; ty0 = ty1; ty1 = tmp }
  if (ty0 > t0) t0 = ty0
  if (ty1 < t1) t1 = ty1
  if (t0 > t1) return false

  // Z slab
  let tz0: f32 = (minZ - oz) * invDz
  let tz1: f32 = (maxZ - oz) * invDz
  if (invDz < 0) { const tmp = tz0; tz0 = tz1; tz1 = tmp }
  if (tz0 > t0) t0 = tz0
  if (tz1 < t1) t1 = tz1
  if (t0 > t1) return false

  return true
}

// ── Ray-triangle intersection (Möller–Trumbore) ─────────────────

function intersectTriangle(
  ox: f32, oy: f32, oz: f32,
  dx: f32, dy: f32, dz: f32,
  v0x: f32, v0y: f32, v0z: f32,
  v1x: f32, v1y: f32, v1z: f32,
  v2x: f32, v2y: f32, v2z: f32,
  tMax: f32,
): f32 {
  const e1x = v1x - v0x; const e1y = v1y - v0y; const e1z = v1z - v0z
  const e2x = v2x - v0x; const e2y = v2y - v0y; const e2z = v2z - v0z

  const hx = dy * e2z - dz * e2y
  const hy = dz * e2x - dx * e2z
  const hz = dx * e2y - dy * e2x

  const a = e1x * hx + e1y * hy + e1z * hz
  if (a > -0.0000001 && a < 0.0000001) return -1.0

  const f = 1.0 / a
  const sx = ox - v0x; const sy = oy - v0y; const sz = oz - v0z
  const u = f * (sx * hx + sy * hy + sz * hz)
  if (u < 0 || u > 1) return -1.0

  const qx = sy * e1z - sz * e1y
  const qy = sz * e1x - sx * e1z
  const qz = sx * e1y - sy * e1x
  const v = f * (dx * qx + dy * qy + dz * qz)
  if (v < 0 || u + v > 1) return -1.0

  const t = f * (e2x * qx + e2y * qy + e2z * qz)
  if (t > 0.001 && t < tMax) return t
  return -1.0
}

// ── BVH Traversal ────────────────────────────────────────────────
// Ray layout (6 f32s): [ox, oy, oz, dx, dy, dz]

/** Trace one ray through BVH. Returns t of closest hit, or -1. */
export function bvhTraverseOne(
  ray: usize,
  nodes: usize,
  triangles: usize,
): f32 {
  const ox = load<f32>(ray);       const oy = load<f32>(ray + 4);       const oz = load<f32>(ray + 8)
  const dx = load<f32>(ray + 12);  const dy = load<f32>(ray + 16);      const dz = load<f32>(ray + 20)
  const invDx: f32 = 1.0 / dx;     const invDy: f32 = 1.0 / dy;         const invDz: f32 = 1.0 / dz

  let closestT: f32 = 1e30
  const stack: usize = 4096 * 4 // scratch stack space (4096 i32s)
  let sp: i32 = 0

  store<i32>(stack, 0) // push root node (index 0)
  sp = 1

  while (sp > 0) {
    sp--
    const nodeIdx = load<i32>(stack + sp * 4)
    const nBase: usize = nodes + nodeIdx * NODE_SIZE

    const minX = load<f32>(nBase);        const minY = load<f32>(nBase + 4);       const minZ = load<f32>(nBase + 8)
    const maxX = load<f32>(nBase + 12);   const maxY = load<f32>(nBase + 16);      const maxZ = load<f32>(nBase + 20)

    if (!intersectAABB(ox, oy, oz, dx, dy, dz, invDx, invDy, invDz, minX, minY, minZ, maxX, maxY, maxZ, closestT)) continue

    const leftIdx = load<i32>(nBase + 24)
    if (leftIdx == -1) {
      // Leaf: test triangles
      const triStart = load<i32>(nBase + 28)
      // For simplicity, assume 4 triangles per leaf (build guarantee)
      for (let t: i32 = triStart; t < triStart + 4; t++) {
        const tBase: usize = triangles + t * TRI_SIZE
        const v0x = load<f32>(tBase);        const v0y = load<f32>(tBase + 4);       const v0z = load<f32>(tBase + 8)
        const v1x = load<f32>(tBase + 12);   const v1y = load<f32>(tBase + 16);      const v1z = load<f32>(tBase + 20)
        const v2x = load<f32>(tBase + 24);   const v2y = load<f32>(tBase + 28);      const v2z = load<f32>(tBase + 32)
        const tHit = intersectTriangle(ox, oy, oz, dx, dy, dz, v0x, v0y, v0z, v1x, v1y, v1z, v2x, v2y, v2z, closestT)
        if (tHit > 0 && tHit < closestT) closestT = tHit
      }
    } else {
      const rightIdx = load<i32>(nBase + 28)
      // Push children (right first = left processed first)
      if (rightIdx >= 0) { store<i32>(stack + sp * 4, rightIdx); sp++ }
      if (leftIdx >= 0)  { store<i32>(stack + sp * 4, leftIdx);  sp++ }
    }
  }

  return closestT < 1e29 ? closestT : -1.0
}
