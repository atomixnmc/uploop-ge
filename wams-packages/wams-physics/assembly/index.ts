// AssemblyScript entry for wams-physics
// Memory layout (per body, 11 f32s = 44 bytes):
//   [0-2] position (x,y,z)
//   [3-5] velocity (x,y,z)
//   [6-8] acceleration (x,y,z)
//   [9]   mass
//   [10]  radius
const BODY_STRIDE: i32 = 11
const BODY_SIZE: i32 = BODY_STRIDE * 4

// Contact manifold (16 f32s = 64 bytes):
//   [0-2]  contact point
//   [3-5]  contact normal
//   [6]    penetration depth
const CONTACT_STRIDE: i32 = 16

// ── Semi-implicit Euler integration ──────────────────────────────

export function integrateBodies(bodies: usize, count: i32, dt: f32): void {
  for (let i: i32 = 0; i < count; i++) {
    const base: usize = bodies + i * BODY_SIZE
    // v += a * dt
    store<f32>(base + 12, load<f32>(base + 12) + load<f32>(base + 24) * dt)
    store<f32>(base + 16, load<f32>(base + 16) + load<f32>(base + 28) * dt)
    store<f32>(base + 20, load<f32>(base + 20) + load<f32>(base + 32) * dt)
    // p += v * dt
    store<f32>(base,       load<f32>(base)       + load<f32>(base + 12) * dt)
    store<f32>(base + 4,   load<f32>(base + 4)   + load<f32>(base + 16) * dt)
    store<f32>(base + 8,   load<f32>(base + 8)   + load<f32>(base + 20) * dt)
    // Reset acceleration
    store<f32>(base + 24, 0)
    store<f32>(base + 28, 0)
    store<f32>(base + 32, 0)
  }
}

// ── Apply gravity ────────────────────────────────────────────────

export function applyGravity(bodies: usize, count: i32, g: f32): void {
  for (let i: i32 = 0; i < count; i++) {
    const base: usize = bodies + i * BODY_SIZE
    store<f32>(base + 28, load<f32>(base + 28) + g)
  }
}

// ── Broadphase: Sweep & Prune on X axis ──────────────────────────

export function broadphaseSAP(
  bodies: usize,
  count: i32,
  pairsOut: usize,
): i32 {
  // Sort body indices by min-X (store in scratch area at pairsOut)
  // For simplicity, use insertion sort on small N
  const indices: usize = pairsOut
  const minX: usize = pairsOut + count * 4  // scratch for min-X values

  for (let i: i32 = 0; i < count; i++) {
    const base: usize = bodies + i * BODY_SIZE
    const r = load<f32>(base + 40) // radius
    store<f32>(minX + i * 4, load<f32>(base) - r)
    store<i32>(indices + i * 4, i)
  }

  // Insertion sort by minX
  for (let i: i32 = 1; i < count; i++) {
    const key: i32 = load<i32>(indices + i * 4)
    const keyX: f32 = load<f32>(minX + key * 4)
    let j: i32 = i - 1
    while (j >= 0 && load<f32>(minX + load<i32>(indices + j * 4) * 4) > keyX) {
      store<i32>(indices + (j + 1) * 4, load<i32>(indices + j * 4))
      j--
    }
    store<i32>(indices + (j + 1) * 4, key)
  }

  // Sweep: collect overlapping pairs
  let pairCount: i32 = 0
  const pairBase: usize = indices + count * 4 // pairs array starts after indices

  for (let i: i32 = 0; i < count; i++) {
    const ai: i32 = load<i32>(indices + i * 4)
    const aBase: usize = bodies + ai * BODY_SIZE
    const ax: f32 = load<f32>(aBase)
    const ar: f32 = load<f32>(aBase + 40)
    const aMaxX: f32 = ax + ar

    for (let j: i32 = i + 1; j < count; j++) {
      const bj: i32 = load<i32>(indices + j * 4)
      const bBase: usize = bodies + bj * BODY_SIZE
      const bx: f32 = load<f32>(bBase)
      const br: f32 = load<f32>(bBase + 40)
      const bMinX: f32 = bx - br

      if (bMinX > aMaxX) break // Sorted — no more overlaps for this i

      // Check Y and Z overlap too
      const ay: f32 = load<f32>(aBase + 4)
      const az: f32 = load<f32>(aBase + 8)
      const by: f32 = load<f32>(bBase + 4)
      const bz: f32 = load<f32>(bBase + 8)

      const dx: f32 = ax - bx; const dy: f32 = ay - by; const dz: f32 = az - bz
      const distSq: f32 = dx*dx + dy*dy + dz*dz
      const radSum: f32 = ar + br

      if (distSq < radSum * radSum) {
        // Store pair: [bodyA idx, bodyB idx]
        store<i32>(pairBase + pairCount * 8, ai)
        store<i32>(pairBase + pairCount * 8 + 4, bj)
        pairCount++
      }
    }
  }

  return pairCount
}

// ── Narrowphase: SAT sphere-sphere ───────────────────────────────

export function resolveContacts(
  bodies: usize,
  pairs: usize,
  pairCount: i32,
  contacts: usize,
  restitution: f32,
): i32 {
  let contactCount: i32 = 0

  for (let p: i32 = 0; p < pairCount; p++) {
    const ai: i32 = load<i32>(pairs + p * 8)
    const bi: i32 = load<i32>(pairs + p * 8 + 4)
    const aBase: usize = bodies + ai * BODY_SIZE
    const bBase: usize = bodies + bi * BODY_SIZE

    const ax = load<f32>(aBase);      const ay = load<f32>(aBase + 4);    const az = load<f32>(aBase + 8)
    const bx = load<f32>(bBase);      const by = load<f32>(bBase + 4);    const bz = load<f32>(bBase + 8)
    const ar = load<f32>(aBase + 40); const br = load<f32>(bBase + 40)

    const dx: f32 = ax - bx; const dy: f32 = ay - by; const dz: f32 = az - bz
    const dist: f32 = Mathf.sqrt(dx*dx + dy*dy + dz*dz)
    const penetration: f32 = (ar + br) - dist

    if (penetration <= 0 || dist < 0.0001) continue

    // Contact normal
    const invDist: f32 = 1.0 / dist
    const nx: f32 = dx * invDist; const ny: f32 = dy * invDist; const nz: f32 = dz * invDist

    // Contact point (midpoint of overlap)
    const cBase: usize = contacts + contactCount * CONTACT_STRIDE * 4
    store<f32>(cBase,       ax - nx * (ar - penetration * 0.5))
    store<f32>(cBase + 4,   ay - ny * (ar - penetration * 0.5))
    store<f32>(cBase + 8,   az - nz * (ar - penetration * 0.5))
    store<f32>(cBase + 12,  nx)
    store<f32>(cBase + 16,  ny)
    store<f32>(cBase + 20,  nz)
    store<f32>(cBase + 24,  penetration)

    // ── Impulse resolution ─────────────────────────────────
    const am: f32 = load<f32>(aBase + 36); const bm: f32 = load<f32>(bBase + 36)
    const invMassSum: f32 = 1.0 / am + 1.0 / bm
    if (invMassSum < 0.0001) continue

    const avx = load<f32>(aBase + 12); const avy = load<f32>(aBase + 16); const avz = load<f32>(aBase + 20)
    const bvx = load<f32>(bBase + 12); const bvy = load<f32>(bBase + 16); const bvz = load<f32>(bBase + 20)

    const relVel: f32 = (avx - bvx) * nx + (avy - bvy) * ny + (avz - bvz) * nz

    // Only resolve if approaching
    if (relVel > 0) continue

    const j: f32 = -(1.0 + restitution) * relVel / invMassSum

    // Apply impulse
    store<f32>(aBase + 12, avx + j / am * nx)
    store<f32>(aBase + 16, avy + j / am * ny)
    store<f32>(aBase + 20, avz + j / am * nz)
    store<f32>(bBase + 12, bvx - j / bm * nx)
    store<f32>(bBase + 16, bvy - j / bm * ny)
    store<f32>(bBase + 20, bvz - j / bm * nz)

    // Positional correction
    const slop: f32 = 0.01
    const correction: f32 = 0.2 * Mathf.max(penetration - slop, 0) / invMassSum
    store<f32>(aBase,       ax + correction / am * nx)
    store<f32>(aBase + 4,   ay + correction / am * ny)
    store<f32>(aBase + 8,   az + correction / am * nz)
    store<f32>(bBase,       bx - correction / bm * nx)
    store<f32>(bBase + 4,   by - correction / bm * ny)
    store<f32>(bBase + 8,   bz - correction / bm * nz)

    contactCount++
  }

  return contactCount
}

// ── Full step ────────────────────────────────────────────────────

export function physicsStep(
  bodies: usize,
  maxBodies: i32,
  pairs: usize,
  maxPairs: i32,
  contacts: usize,
  dt: f32,
  iterations: i32,
): void {
  const count = maxBodies // In WASM, caller manages count

  // Apply external forces
  applyGravity(bodies, count, -9.8)

  // Integrate
  integrateBodies(bodies, count, dt)

  // Collision detection + response (multiple iterations)
  for (let iter: i32 = 0; iter < iterations; iter++) {
    const pairCount = broadphaseSAP(bodies, count, pairs)
    resolveContacts(bodies, pairs, pairCount, contacts, 0.3)
  }
}
