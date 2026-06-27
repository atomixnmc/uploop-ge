// AssemblyScript entry for wams-math
// Exports batch-oriented vec3/mat4/quat operations for WASM acceleration
// Runtime: stub (no GC) — all memory managed by caller

// ── Vec3 batch operations ────────────────────────────────────────
// Vec3 = 3 × f32 = 12 bytes (no padding in base tier)
// For SIMD tier, use 16 bytes (vec4-padded)

/** Element-wise add: out[i] = a[i] + b[i], count vec3s */
export function vec3Add(out: usize, a: usize, b: usize, count: i32): void {
  for (let i: i32 = 0; i < count * 3; i++) {
    store<f32>(out + i * 4, load<f32>(a + i * 4) + load<f32>(b + i * 4))
  }
}

/** Element-wise subtract: out[i] = a[i] - b[i] */
export function vec3Sub(out: usize, a: usize, b: usize, count: i32): void {
  for (let i: i32 = 0; i < count * 3; i++) {
    store<f32>(out + i * 4, load<f32>(a + i * 4) - load<f32>(b + i * 4))
  }
}

/** Element-wise scale: out[i] = ptr[i] * s */
export function vec3Scale(out: usize, ptr: usize, s: f32, count: i32): void {
  for (let i: i32 = 0; i < count * 3; i++) {
    store<f32>(out + i * 4, load<f32>(ptr + i * 4) * s)
  }
}

/** Dot product batch: out[i] = dot(a[i], b[i]) */
export function vec3DotBatch(out: usize, a: usize, b: usize, count: i32): void {
  for (let i: i32 = 0; i < count; i++) {
    const off: i32 = i * 3 * 4
    const ax = load<f32>(a + off)
    const ay = load<f32>(a + off + 4)
    const az = load<f32>(a + off + 8)
    const bx = load<f32>(b + off)
    const by = load<f32>(b + off + 4)
    const bz = load<f32>(b + off + 8)
    store<f32>(out + i * 4, ax * bx + ay * by + az * bz)
  }
}

/** Cross product batch: out[i] = cross(a[i], b[i]) */
export function vec3CrossBatch(out: usize, a: usize, b: usize, count: i32): void {
  for (let i: i32 = 0; i < count; i++) {
    const off: i32 = i * 3 * 4
    const ax = load<f32>(a + off)
    const ay = load<f32>(a + off + 4)
    const az = load<f32>(a + off + 8)
    const bx = load<f32>(b + off)
    const by = load<f32>(b + off + 4)
    const bz = load<f32>(b + off + 8)
    const ooff: i32 = i * 3 * 4
    store<f32>(out + ooff,       ay * bz - az * by)
    store<f32>(out + ooff + 4,   az * bx - ax * bz)
    store<f32>(out + ooff + 8,   ax * by - ay * bx)
  }
}

/** Length batch: out[i] = length(ptr[i]) */
export function vec3LengthBatch(out: usize, ptr: usize, count: i32): void {
  for (let i: i32 = 0; i < count; i++) {
    const off: i32 = i * 3 * 4
    const x = load<f32>(ptr + off)
    const y = load<f32>(ptr + off + 4)
    const z = load<f32>(ptr + off + 8)
    store<f32>(out + i * 4, Mathf.sqrt(x * x + y * y + z * z))
  }
}

/** Normalize batch: out[i] = normalize(ptr[i]) */
export function vec3NormalizeBatch(out: usize, ptr: usize, count: i32): void {
  for (let i: i32 = 0; i < count; i++) {
    const off: i32 = i * 3 * 4
    const x = load<f32>(ptr + off)
    const y = load<f32>(ptr + off + 4)
    const z = load<f32>(ptr + off + 8)
    const len: f32 = Mathf.sqrt(x * x + y * y + z * z)
    const inv: f32 = len > 0.000001 ? 1.0 / len : 0.0
    const ooff: i32 = i * 3 * 4
    store<f32>(out + ooff,       x * inv)
    store<f32>(out + ooff + 4,   y * inv)
    store<f32>(out + ooff + 8,   z * inv)
  }
}

/** Lerp batch: out[i] = lerp(a[i], b[i], t) */
export function vec3LerpBatch(out: usize, a: usize, b: usize, t: f32, count: i32): void {
  for (let i: i32 = 0; i < count * 3; i++) {
    const av = load<f32>(a + i * 4)
    const bv = load<f32>(b + i * 4)
    store<f32>(out + i * 4, av + (bv - av) * t)
  }
}

// ── Vec3 × Mat4 transform batch ──────────────────────────────────
// out[i] = mat4Transform(pos[i], mat) — one matrix applied to count positions

/** Transform count vec3 positions by a single mat4: out[i] = mat * vec4(in[i], 1.0) */
export function vec3TransformMat4Batch(out: usize, inPtr: usize, mat: usize, count: i32): void {
  const m11 = load<f32>(mat);       const m12 = load<f32>(mat + 4)
  const m13 = load<f32>(mat + 8);   const m14 = load<f32>(mat + 12)
  const m21 = load<f32>(mat + 16);  const m22 = load<f32>(mat + 20)
  const m23 = load<f32>(mat + 24);  const m24 = load<f32>(mat + 28)
  const m31 = load<f32>(mat + 32);  const m32 = load<f32>(mat + 36)
  const m33 = load<f32>(mat + 40);  const m34 = load<f32>(mat + 44)
  const m41 = load<f32>(mat + 48);  const m42 = load<f32>(mat + 52)
  const m43 = load<f32>(mat + 56);  const m44 = load<f32>(mat + 60)

  for (let i: i32 = 0; i < count; i++) {
    const off: i32 = i * 3 * 4
    const x = load<f32>(inPtr + off)
    const y = load<f32>(inPtr + off + 4)
    const z = load<f32>(inPtr + off + 8)
    const w: f32 = 1.0
    const ooff: i32 = i * 3 * 4
    store<f32>(out + ooff,       m11 * x + m21 * y + m31 * z + m41 * w)
    store<f32>(out + ooff + 4,   m12 * x + m22 * y + m32 * z + m42 * w)
    store<f32>(out + ooff + 8,   m13 * x + m23 * y + m33 * z + m43 * w)
  }
}

// ── Mat4 operations ──────────────────────────────────────────────
// 16 × f32 = 64 bytes, column-major

/** mat4 multiply: out = a × b (column-major) */
export function mat4Multiply(out: usize, a: usize, b: usize): void {
  for (let col: i32 = 0; col < 4; col++) {
    for (let row: i32 = 0; row < 4; row++) {
      let sum: f32 = 0.0
      for (let k: i32 = 0; k < 4; k++) {
        sum += load<f32>(a + (k * 16 + row * 4)) * load<f32>(b + (col * 16 + k * 4))
      }
      store<f32>(out + (col * 16 + row * 4), sum)
    }
  }
}

// ── AABB operations ──────────────────────────────────────────────

/** Union of two AABBs: out = union(a, b) */
export function aabbUnion(out: usize, a: usize, b: usize): void {
  for (let i: i32 = 0; i < 3; i++) {
    store<f32>(out + i * 4,       Mathf.min(load<f32>(a + i * 4), load<f32>(b + i * 4)))
    store<f32>(out + (i + 3) * 4, Mathf.max(load<f32>(a + (i + 3) * 4), load<f32>(b + (i + 3) * 4)))
  }
}
