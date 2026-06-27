# uploop-ge — v0.3.x WAMS Packages Plan

## Overview

`wams-packages/` holds AssemblyScript-compiled WebAssembly modules for
maximum performance. Each WAMS package mirrors a JS package, providing
WASM-accelerated hot paths while keeping the JS API identical.

The architecture follows Uploop HyperGraph concepts: WASM modules are
graph nodes, memory buffers are shared edges, and the JS layer remains
the orchestrator.

```
JavaScript (orchestrator, game loop, state)
    ↓ calls
WASM module (compute node)
    ↓ reads/writes
SharedArrayBuffer / transferable memory (data edges)
```

## How uploop-ge Utilizes WASM

### The Core Insight

WASM doesn't replace the architecture. It replaces **hot numeric loops**
inside functions that already exist. The Uploop pattern
(`state → update → render`) stays intact — WASM just makes the
`update` step faster.

```
JavaScript (orchestrator)          WASM (compute)
┌──────────────────────┐          ┌─────────────────────┐
│ createGameLoop       │          │                     │
│  state: { ... }      │          │  physics.step()     │
│  update: {           │  call    │  bvh.build()        │
│    tick(s, dt) ──────┼─────────►│  tracer.trace()     │
│      phys.step(dt)   │          │  skin 100 meshes    │
│  }                   │          │                     │
│  render(state, a)    │          │                     │
└──────────────────────┘          └─────────────────────┘
```

### What Moves to WASM

Only **pure-compute, data-parallel** paths:

| What | Why WASM | Expected Speedup |
|------|----------|-----------------|
| Physics broadphase (SAP) | Sorting + scanning thousands of AABBs | 3–8× |
| Physics narrowphase (SAT/GJK) | Dense float math per collision pair | 5–15× |
| BVH build (SAH binning) | Sorting + bounding box ops on 100k tris | 4–10× |
| BVH traversal (ray trace) | Branch-heavy traversal, no allocation | 3–6× |
| Vertex skinning (matrix palette) | 4×4 mat × vec4 for every vertex | 5–20× |
| Particle integration | Float ops on large arrays, no branches | 3–5× |
| Path trace shading (BSDF eval) | Pure math: GGX, Fresnel, sampling | 2–4× |
| Mesh decimation (edge collapse) | Priority queue + quadric error | 3–6× |

### What Stays in JS

| What | Why NOT WASM |
|------|-------------|
| WebGL/WebGPU calls | WASM has zero GPU access — must call through JS |
| DOM / canvas sizing | No DOM in WASM |
| Event handling | Keyboard, mouse, gamepad = JS domain |
| State management | `createGameLoop` state dispatch = JS objects |
| Import/export orchestration | Dynamic `import()`, Vite HMR |
| GLSL/WGSL shader compilation | WASM can't talk to GPU driver |
| Network (fetch, WebSocket) | JS fetch is simpler; WASM can call via imports |

**WASM is a compute co-processor, not an application runtime.**

---

## EngineConfig: One-Line WASM Init

Users opt into WASM through the EngineConfig. No manual `fetch`, no
memory management, no tier detection.

```js
const engine = await createEngine({
  canvas,
  wasm: {
    enabled: true,
    packages: ['physics', 'bvh'],  // or 'all'
    fallback: 'auto',             // 'auto' | 'js-only' | 'wasm-required'
    physics: { maxBodies: 5000 }, // optional pool sizing
  },
})
```

### What `createEngine` Does Internally

```
createEngine(canvas, opts)
  │
  ├─► detectRenderer(canvas)           // WebGL2 / WebGPU / 2D
  │
  ├─► detectWASM()
  │     ├─ WebAssembly available?      → baseline WASM
  │     ├─ SharedArrayBuffer?          → threading possible
  │     ├─ SIMD (validate v128 types)? → SIMD available
  │     └─ choose tier: full | simd | base
  │
  ├─► loadWASMPackages(opts.wasm)
  │     ├─ fetch + instantiate each .wasm
  │     ├─ allocate shared memory pool (once, never grows)
  │     ├─ expose wasm.math.vec3Add(...) etc.
  │     └─ if fail & fallback='auto' → wasm = null, log warning
  │
  └─► return engine { canvas, gl, renderer, wasm, loop, describe, dispose }
```

### WASM Package Selection

| Value | Loads | Size (gzip) | Use when |
|-------|-------|-------------|----------|
| `'math'` | vec3/mat4/quat bulk ops | ~8 KB | 500+ transforms |
| `'physics'` | broadphase + narrowphase + solver | ~15 KB | 100+ rigid bodies |
| `'bvh'` | BVH build + ray traverse | ~12 KB | Ray tracing or 1000+ collision queries |
| `'geometry'` | vertex skinning + morph + decimate | ~10 KB | Animated characters, LOD |
| `'raytracer'` | full path tracer | ~18 KB | Offline/preview rendering |
| `'all'` | everything | ~55 KB | Max perf, all features |
| `['physics', 'bvh']` | selective | ~27 KB | Targeted acceleration |

### Fallback Behavior

| Value | Behavior |
|-------|----------|
| `'auto'` (default) | Try WASM → fall back to JS silently. Log warning. |
| `'js-only'` | Never load WASM. Use pure JS packages. |
| `'wasm-required'` | Throw `EngineError` if WASM fails to instantiate. |

### Memory Model

```
WASM Memory (single contiguous ArrayBuffer, allocated once)
├── math workspace     (64 KB  — scratch for mat4 ops)
├── physics bodies     (N × 44 bytes/body)
├── physics contacts   (M × 64 bytes/contact)
├── BVH nodes          (dynamic — rebuilt each frame)
└── ray results        (4 × samples × 16 bytes/hit)
```

No runtime growth. No GC. Predictable frame budget.

---

## Pros & Cons

### Pros

| Pro | Detail |
|-----|--------|
| **Predictable performance** | No JIT warmup, no deopt, no GC pauses. Same speed frame 1 and frame 1000. |
| **Near-native math** | SIMD 128-bit: 4 floats × 1 instruction. Beats V8 JIT on float-heavy code. |
| **Zero-copy sharing** | `Float32Array` over WASM memory → renderer reads positions directly. |
| **True multi-threaded physics** | `SharedArrayBuffer` + WASM threads. Not possible in pure JS without copying. |
| **Small binaries** | AssemblyScript → WASM is ~20–50 KB gzipped. Much smaller than emscripten (~500 KB+). |
| **Deterministic across browsers** | Same WASM bytecode = same results Chrome/Firefox/Safari. No JIT variance. |
| **Gradual adoption** | Start with one hot function. No rewrite. JS `createGameLoop` stays orchestrator. |

### Cons

| Con | Detail |
|-----|--------|
| **No DOM/WebGL access** | WASM cannot call `gl.drawArrays()`. Every GPU call bounces through JS imports. |
| **Debugging is painful** | No breakpoints in WASM without Chrome DevTools WASM debugging. Stack traces are numeric offsets. |
| **Build step required** | Can't iterate as fast as pure JS. Need `asc` compiler + watcher. |
| **AssemblyScript is not TypeScript** | No closures, no generics at runtime, no `any`, no regex, no `Date`. Strict subset. |
| **Manual memory (stub runtime)** | You `malloc`/`free`. Leaks crash the tab. No guard rails. |
| **SIMD not universal** | Safari doesn't enable WASM SIMD by default. Need feature detection + fallback. |
| **Threading requires COOP/COEP** | Breaks third-party CDN embeds unless they opt in via CORP headers. |
| **Module size overhead** | Even minimal WASM is ~2–5 KB. Only worth it for 100+ ops/frame. |
| **Call overhead** | JS → WASM is ~10–50 ns. Fine for `stepSimulation()` once/frame. Bad if called per-particle in a loop. |

---

## Gotchas

### 1. The JS ↔ WASM Boundary is NOT Free

```js
// ❌ BAD: calling WASM per entity in a loop — 5000 boundary crossings
for (let i = 0; i < 5000; i++) {
  wasm.integrateOne(bodyPtr, i, dt)
}

// ✅ GOOD: one call, WASM loops internally — 1 boundary crossing
wasm.integrateBatch(bodiesPtr, 5000, dt)
```

**Rule**: One WASM call per system per frame, not per entity.

### 2. Float Types Are Fragile

AssemblyScript `f32`/`f64` map directly, but JS numbers are always `f64`.
Mismatched reads produce garbage or NaN.

```assemblyscript
// AssemblyScript
export function readFirst(ptr: usize): f32 {
  return load<f32>(ptr)  // reads exactly 4 bytes
}

// ❌ BUG: reads 8 bytes from a 4-byte-aligned f32 buffer
export function readFirstBad(ptr: usize): f64 {
  return load<f64>(ptr)  // garbage or NaN
}
```

**Rule**: Match `Float32Array` ↔ `f32`, `Float64Array` ↔ `f64` exactly.
Document the memory layout per package.

### 3. Memory Growth Invalidates Views

```js
const view = new Float32Array(memory.buffer, offset, count)
wasm.allocateMore()  // triggers memory.grow → new ArrayBuffer!

// view.buffer is now detached! view is garbage.
```

**Fix**: Allocate all WASM memory upfront. Never grow after init.
The EngineConfig does this automatically.

### 4. `--runtime stub` Has No GC

This is what you want for games, but it means:
- No `string` in WASM exports (strings need GC)
- No `Array`, `Map`, `Set` (all need GC)
- Only `i32`, `i64`, `f32`, `f64`, raw pointers
- Manual `heap.alloc(size)` and `heap.free(ptr)`

```assemblyscript
// ❌ won't compile with --runtime stub
export function greet(): string { return "hello" }

// ✅ pass string data as pointer + length
export function processName(ptr: usize, len: i32): void {
  for (let i = 0; i < len; i++) {
    const char = load<u16>(ptr + i * 2)  // UTF-16
  }
}
```

### 5. SIMD Requires 16-Byte Alignment

```assemblyscript
// Vec3 = 12 bytes — NOT aligned
export function addVec3Batch(ptr: usize, count: i32): void {
  for (let i = 0; i < count; i++) {
    const offset = ptr + i * 12
    // ❌ v128.load requires 16-byte alignment
    const a = v128.load(offset)  // SIGBUS or garbage
  }
}
```

**Fix**: Pad `Vec3` to `Vec4` (16 bytes) for WASM SIMD:

```js
// JS: store as [x, y, z, _pad] — 16 bytes, always aligned
const view = new Float32Array(memory.buffer, ptr, count * 4)
view[i * 4 + 3] = 0  // padding
```

### 6. You Still Need `Math.sin` from JS

WASM has no `Math` library. Each `Math.sin` call is a JS → WASM → JS
round-trip (~50–100 ns). For particle systems calling sin/cos per
particle, this adds up.

**Fix**: Use polynomial approximations in WASM:

```assemblyscript
// Simon's sin approximation — ~0.001 max error, no JS call
function fastSin(x: f32): f32 {
  const B = 4 / Mathf.PI
  const C = -4 / (Mathf.PI * Mathf.PI)
  return B * x + C * x * abs(x)
}
```

### 7. Debugging Requires Source Maps

Without source maps:
```
RuntimeError: unreachable
    at wasm-function[42]:0x2a3f
```

With source maps:
```
RuntimeError: unreachable
    at physics/broadphase.ts:67:12
```

Build for debug:
```bash
npx asc assembly/index.ts \
  --outFile build/wams-physics.wasm \
  --sourceMap --debug
```

### 8. Multi-Threading Needs Feature Detection

```js
// EngineConfig does this automatically
async function detectWASM() {
  const hasSAB = typeof SharedArrayBuffer !== 'undefined'
  const hasSIMD = WebAssembly.validate(
    new Uint8Array([0,97,115,109,1,0,0,0, 1,5,1,96,0,1,123])
  )
  const hasThreads = typeof Atomics !== 'undefined'

  if (hasSAB && hasSIMD && hasThreads) return 'full'
  if (hasSIMD) return 'simd'
  return 'base'  // or null → JS fallback
}
```

### 9. Vite HMR Doesn't Track WASM

WASM modules loaded via `WebAssembly.instantiate` are invisible to Vite
HMR. Changing AssemblyScript source requires:

1. Rebuild WASM (`asc` compiler)
2. **Full page reload** (no HMR)
3. State is lost

**Fix**: Separate build watch from Vite dev:

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"npm run watch:wasm\"",
    "watch:wasm": "nodemon --watch wams-packages -e ts --exec 'npm run build:wasm'"
  }
}
```

### 10. Browser Support Matrix

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| WASM baseline | 57+ ✅ | 52+ ✅ | 11+ ✅ |
| SIMD 128 | 91+ ✅ | 89+ ✅ | 16.4+ ⚠️ (behind flag) |
| Threads + atomics | 74+ ✅ | 79+ ✅ | 15.2+ ⚠️ (behind flag) |
| Bulk memory ops | 96+ ✅ | 98+ ✅ | 15+ ✅ |
| Reference types | 96+ ✅ | 79+ ✅ | ❌ |
| GC (wasm-gc) | 119+ ✅ | 120+ ✅ | ❌ |

**EngineConfig builds three tiers automatically**:
1. `*-full.wasm` — SIMD + threads (Chrome, FF)
2. `*-base.wasm` — baseline WASM (Safari, older browsers)
3. JS fallback — pure JS (`@uploop/physics` directly)

---

## v0.3.1 — wams-math

AssemblyScript implementations of hot math functions.

### Files
```
wams-packages/wams-math/
  assembly/
    index.ts           — entry point, exports all
    vec3.ts            — add, sub, dot, cross, normalize, lerp, transformMat4
    mat4.ts            — multiply, inverse, transpose, lookAt, perspective, fromYRotation
    quat.ts            — slerp, multiply, fromEuler, normalize
    aabb.ts            — union, intersect, contains, expand
  build/
    wams-math.wasm     — compiled (optimize speed, runtime stub)
  package.json
  asconfig.json
```

### API (mirrors @uploop/math, batch-oriented)
```js
const wasm = engine.wasm.math

// Single ops (thin wrapper — only worth it when batching)
wasm.vec3Add(outPtr, aPtr, bPtr)

// Batch ops (the real win — thousands in one WASM call)
wasm.vec3TransformMat4Batch(outPtr, inPtr, matPtr, count)
// Processes `count` vec3s through a mat4 in one call
// ~15–20× faster than JS loop for count > 500
```

### Build Command
```bash
npx asc assembly/index.ts \
  --outFile build/wams-math.wasm \
  --optimize speed \
  --runtime stub \
  --enable simd
```

---

## v0.3.2 — wams-physics

WASM-accelerated rigid body physics.

### Files
```
wams-packages/wams-physics/
  assembly/
    index.ts
    broadphase.ts      — Sweep & Prune, sort + scan
    narrowphase.ts     — SAT (box, sphere), GJK/EPA (convex hull)
    solver.ts          — Impulse-based constraint solver, sequential impulses
    integrator.ts      — Semi-implicit Euler
    memory.ts           — Body/contact layout definitions
  package.json
  asconfig.json
```

### Memory Layout (zero-copy)

```assemblyscript
// Each body: 11 f32s = 44 bytes, 4-byte aligned
// [px, py, pz, vx, vy, vz, ax, ay, az, mass, radius]
const BODY_SIZE: i32 = 44

// Each contact: 16 f32s = 64 bytes, 4-byte aligned
// [px, py, pz, nx, ny, nz, penetration, ba, bb, ...]
const CONTACT_SIZE: i32 = 64
```

### API
```js
const wasm = engine.wasm.physics

// Step all bodies through integration + collision
wasm.step(dt, iterations)  // mutates bodies in-place, returns contact count

// Read body state directly (zero-copy view over WASM memory)
const bodies = wasm.bodiesView   // Float32Array(11 × maxBodies)
const pos = [bodies[i * 11], bodies[i * 11 + 1], bodies[i * 11 + 2]]
```

---

## v0.3.3 — wams-bvh

### Files
```
wams-packages/wams-bvh/
  assembly/
    index.ts
    builder.ts         — SAH binned builder (top-down, 8-bin SAH)
    traverser.ts       — Iterative stack traversal
    refit.ts           — Bottom-up refit (for dynamic scenes)
  package.json
```

### API
```js
const wasm = engine.wasm.bvh

// Build BVH from triangle soup
wasm.build(trianglePtr, triangleCount)

// Trace N rays through BVH
const hitCount = wasm.traverse(rayPtr, rayCount)  // → resultPtr populated
```

---

## v0.3.4 — wams-geometry

### Files
```
wams-packages/wams-geometry/
  assembly/
    index.ts
    skinning.ts        — Linear blend skinning: v' = Σ(wᵢ · Mᵢ · v)
    morph.ts           — Morph target blending: v' = v₀ + Σ(wᵢ · (tᵢ - v₀))
    normal.ts          — Recompute normals from indexed triangles
    simplify.ts        — Quadric error metric edge collapse
  package.json
```

### API
```js
const wasm = engine.wasm.geometry

wasm.skin(vertexPtr, jointMatricesPtr, weightsPtr, jointsPtr, vertexCount)
wasm.morph(basePtr, targetsPtr, weightsPtr, targetCount, vertexCount)
```

---

## v0.3.5 — wams-raytracer

### Files
```
wams-packages/wams-raytracer/
  assembly/
    index.ts
    pathtrace.ts       — Monte Carlo integrator, Russian roulette
    sampling.ts        — Halton sequence, hemisphere sampling
    shading.ts         — Lambert, GGX microfacet, Fresnel-Schlick
  package.json
```

---

## v0.3.6 — Integration Examples

- `32-wams-physics` — 5k rigid bodies, WASM vs JS toggle
- `33-wams-bvh-raytracer` — WASM-accelerated path tracer (vs JS)
- `34-wams-skinning` — 100 animated characters via WASM skinning
- `35-full-wasm-pipeline` — Combined WASM math + physics + BVH + raytracer

---

## Build Configuration

Each WAMS package uses `asconfig.json`:

```json
{
  "targets": {
    "release": {
      "outFile": "build/wams-math.wasm",
      "optimize": "speed",
      "runtime": "stub",
      "enable": ["simd"]
    }
  }
}
```

Build script:
```bash
# Build all WAMS packages
pnpm build:wasm
# → builds each wams-packages/*/assembly → build/*.wasm
```

---

## Package Manifest

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "wams-packages/*"
  - "examples/*"
```
