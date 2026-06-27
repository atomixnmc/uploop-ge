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

## v0.3.1 — wams-math

AssemblyScript implementations of hot math functions.

### Files
```
wams-packages/wams-math/
  assembly/
    index.ts           — entry point
    vec3.ts            — Vec3 operations (add, sub, dot, cross, normalize, lerp)
    mat4.ts            — Mat4 operations (multiply, inverse, lookAt, perspective)
    quat.ts            — Quaternion operations (slerp, multiply, fromEuler)
    aabb.ts            — AABB intersection tests
  build/
    wams-math.wasm     — compiled WASM binary
    wams-math.js       — JS glue (emscripten-style)
  package.json
  asconfig.json
```

### API (mirrors @uploop/math, adds WAMS suffix)
```js
import { WAMSMath } from '@uploop/wams-math'

const math = await WAMSMath.init()
math.vec3Add(out, a, b)           // ~20x faster for bulk ops
math.vec3NormalizeBatch(ptr, count) // process thousands in one WASM call
math.mat4Multiply(out, a, b)
```

---

## v0.3.2 — wams-physics

WASM-accelerated physics: broadphase, narrowphase, constraint solving.

### Files
```
wams-packages/wams-physics/
  assembly/
    broadphase.ts      — Sweep & Prune
    narrowphase.ts     — SAT, GJK/EPA
    solver.ts          — Impulse-based constraint solver
    integrator.ts      — Semi-implicit Euler, RK4
  package.json
```

### API
```js
import { WAMSPhysics } from '@uploop/wams-physics'

const phys = await WAMSPhysics.init()
phys.step(rigidBodies, dt, iterations)  // full physics step in WASM
phys.broadphase(resolvePairs)
```

---

## v0.3.3 — wams-bvh

WASM BVH builder and ray traverser. Massive speedup for ray tracing
and collision detection.

### Files
```
wams-packages/wams-bvh/
  assembly/
    builder.ts         — SAH binning builder
    traverser.ts       — Stackless/stack-based traversal
    refit.ts           — Incremental BVH refit
  package.json
```

### API
```js
import { WAMSBVH } from '@uploop/wams-bvh'

const bvh = await WAMSBVH.init()
bvh.build(positions, indices)        // build BVH in WASM
const hits = bvh.traverse(rays, count) // trace N rays, return hits
```

---

## v0.3.4 — wams-geometry

WASM mesh processing: vertex skinning, morph targets, normal recomputation,
tangent generation.

### Files
```
wams-packages/wams-geometry/
  assembly/
    skinning.ts        — Vertex skinning with joint matrices
    morph.ts           — Morph target blending
    normal.ts          — Normal/tangent recalculation
    simplify.ts        — Mesh decimation (edge collapse)
  package.json
```

---

## v0.3.5 — wams-raytracer

Full WASM path tracer: BVH build, ray generation, shading, accumulation.
Can render in WASM and DMA result to JS canvas.

### Files
```
wams-packages/wams-raytracer/
  assembly/
    pathtrace.ts       — Monte Carlo integrator
    sampling.ts        — Halton/Sobol sequence generators
    shading.ts         — BSDF evaluation (Lambert, GGX, Glass)
  package.json
```

---

## v0.3.6 — Integration & Examples

Examples showing JS ↔ WASM interop with all WAMS packages.

### Examples
- `32-wams-physics` — 5k rigid bodies with WASM physics
- `33-wams-bvh-raytracer` — WASM-accelerated path tracer
- `34-wams-skinning` — 100 animated characters via WASM skinning
- `35-full-wasm-pipeline` — Combined WAMS math + physics + BVH

---

## Build Configuration

Each WAMS package uses `asconfig.json`:

```json
{
  "targets": {
    "release": {
      "outFile": "build/wams-math.wasm",
      "optimize": "speed",
      "runtime": "stub"
    }
  }
}
```

Build command per package:
```bash
cd wams-packages/wams-math
npx asc assembly/index.ts --outFile build/wams-math.wasm --optimize speed --runtime stub
```

---

## JS ↔ WASM Communication

```
Main thread (JS)                    Worker / Main thread (WASM)
┌─────────────────┐                ┌──────────────────────┐
│ createGameLoop   │  SharedArrayBuf│ WASM module          │
│ ┌─────────────┐  │◄──────────────►│ ┌──────────────────┐ │
│ │ state       │  │                │ │ wamsMath.add(a,b)│ │
│ │ update:tick │──┼──call──────────►│ │ wamsBVH.build()  │ │
│ │ render      │  │                │ │ wamsPhys.step()  │ │
│ └─────────────┘  │                │ └──────────────────┘ │
└─────────────────┘                └──────────────────────┘
```

Data flows:
1. JS prepares typed arrays in SharedArrayBuffer
2. WASM called with pointer + count
3. WASM mutates shared memory in-place
4. JS reads results (zero copy)

---

## Package manifest (pnpm-workspace.yaml)

```yaml
packages:
  - "packages/*"
  - "wams-packages/*"
  - "examples/*"
```
