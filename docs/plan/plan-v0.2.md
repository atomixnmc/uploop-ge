# uploop-ge — v0.2.x Planning

## Status

| Phase | Scope | Status |
|-------|-------|--------|
| v0.2.1 | `@uploop/parallel` — worker pool, scheduler, tasks | ✅ done |
| v0.2.2 | `@uploop/director` — cinematic camera, behaviors, constraints | ✅ done |
| v0.2.3 | `@uploop/custom-pipeline` — multi-pass, deferred, post-FX | ✅ done |
| v0.2.4 | `@uploop/ray-tracing` — BVH, path tracer | ✅ done |
| v0.2.5 | EngineConfig init system, examples 28–31 | 🟡 in progress |

---

## v0.2.5 — EngineConfig & `@uploop/engine`

Single entry point that auto-detects WebGL/WebGPU/WASM capabilities and
wires up the right pipeline. Users opt into WASM with a simple flag block.

### Design Goals

- **One `await createEngine(opts)` call** — no manual `getContext`, no manual WASM `fetch`
- **WASM is opt-in** — disabled by default, single flag to enable
- **Automatic fallback** — if WASM fails, degrades to JS silently (or throws if `fallback: 'wasm-required'`)
- **Pre-allocated WASM memory** — no runtime grows, no GC, predictable frame budget
- **Zero-copy** — `Float32Array` views over WASM memory, no serialization
- **HyperGraph manifest** — `engine.describe()` shows WASM modules as graph nodes

### API

```js
import { createEngine } from '@uploop/engine'

const engine = await createEngine({
  // ── Canvas (required) ────────────────────────────────
  canvas: document.querySelector('canvas'),

  // ── WASM (optional — disabled by default) ────────────
  wasm: {
    enabled: true,
    packages: ['math', 'physics', 'bvh'],  // or 'all'
    fallback: 'auto',  // 'auto' | 'js-only' | 'wasm-required'
  },

  // ── Renderer (optional) ──────────────────────────────
  renderer: {
    backend: 'auto',  // 'auto' | 'webgl2' | 'webgpu' (future)
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  },

  // ── Game loop (optional) ─────────────────────────────
  loop: {
    fixedTimestep: 1 / 60,
    maxFrameBudget: 16,
    interpolation: true,
  },
})

// ── What you get ───────────────────────────────────────
engine.canvas         // the canvas element
engine.gl             // WebGL2RenderingContext (or null if 2D)
engine.renderer       // { backend, capabilities, createPipeline, ... }
engine.loop           // createGameLoop compatible (start, stop, send, subscribe)
engine.wasm           // { enabled, math, physics, bvh, ... } or null
engine.dispose()      // cleanup everything

// HyperGraph manifest
console.log(engine.describe())
// {
//   kind: 'uploop.engine',
//   modules: ['renderer:webgl2', 'wasm:physics', 'wasm:bvh'],
//   nodes: [...]
// }
```

### WASM Config Deep-Dive

#### `wasm.packages`

| Value | Loads | Size (gzip) | Use when |
|-------|-------|-------------|----------|
| `'math'` | vec3/mat4/quat bulk ops | ~8 KB | Any 3D scene with 500+ transforms |
| `'physics'` | broadphase + narrowphase + solver | ~15 KB | 100+ rigid bodies |
| `'bvh'` | BVH build + ray traverse | ~12 KB | Ray tracing or 1000+ collision queries |
| `'geometry'` | vertex skinning + morph + decimate | ~10 KB | Animated characters or LOD |
| `'raytracer'` | full path tracer | ~18 KB | Offline/preview rendering |
| `'all'` | everything | ~55 KB | Max perf, all features |
| `['physics', 'bvh']` | selective | ~27 KB | Targeted acceleration |

#### `wasm.fallback`

| Value | Behavior |
|-------|----------|
| `'auto'` (default) | Try WASM, fall back to JS silently. Log warning to console. |
| `'js-only'` | Never load WASM. Use pure JS packages. |
| `'wasm-required'` | Throw `EngineError` if WASM fails to instantiate. |

#### Memory model

```
WASM Memory (single contiguous ArrayBuffer)
├── math workspace     (64 KB  — scratch for mat4 ops)
├── physics bodies     (N × 44 bytes — pos+vel+acc+mass+radius)
├── physics contacts   (M × 64 bytes — contact manifold pairs)
├── BVH nodes          (dynamic — rebuilt each frame)
└── ray results        (4 × samples × 16 bytes — hit data)
```

Allocation happens once in `createEngine()`. The pool sizes are derived from config:

```js
const engine = await createEngine({
  canvas,
  wasm: {
    enabled: true,
    packages: ['physics'],
    // Optional: override default pool sizes
    physics: {
      maxBodies: 5000,
      maxContacts: 2000,
    },
  },
})
```

### Detection & Initialization Flow

```
createEngine(canvas, opts)
  │
  ├─► detectRenderer(canvas)
  │     ├─ canvas.getContext('webgl2')         → if ok, use WebGL2
  │     ├─ canvas.getContext('webgpu')         → if ok, use WebGPU (future)
  │     └─ canvas.getContext('2d')             → fallback 2D
  │
  ├─► detectWASM()
  │     ├─ typeof WebAssembly === 'undefined'  → no WASM support
  │     ├─ check SharedArrayBuffer             → threading possible?
  │     ├─ check SIMD (validate v128 types)    → SIMD available?
  │     └─ choose tier: full | simd | base
  │
  ├─► loadWASMPackages(opts.wasm)
  │     ├─ fetch + instantiate each requested .wasm
  │     ├─ allocate shared memory pool
  │     ├─ expose wasm.math.vec3Add(...) etc.
  │     └─ if fail & fallback='auto' → wasm = null, log warning
  │
  ├─► create engine object
  │     { canvas, gl, renderer, wasm, loop, describe, dispose }
  │
  └─► return engine
```

### Example: Full Init

```js
// examples/32-full-pipeline/main.js
import { createEngine } from '@uploop/engine'
import { createGameLoop } from '@uploop/scene'

export async function init(canvas) {
  const engine = await createEngine({
    canvas,
    wasm: {
      enabled: true,
      packages: ['physics', 'bvh'],
      fallback: 'auto',
      physics: { maxBodies: 5000 },
    },
    renderer: { backend: 'auto', antialias: true },
  })

  // Build scene...
  const loop = createGameLoop({
    state: { bodies: [] },

    update: {
      tick(s, dt) {
        // Uses WASM physics if available, JS fallback otherwise
        engine.wasm?.physics.step(s.bodies, dt)
        return s
      },
    },

    render(state, alpha) {
      // Positions are already in WASM memory — read directly
      const view = engine.wasm?.physics.bodiesView
      for (let i = 0; i < state.bodies.length; i++) {
        drawMesh(view[i * 11], view[i * 11 + 1], view[i * 11 + 2])
      }
    },
  })

  loop.start()
  canvas._loop = loop

  return () => { loop.stop(); engine.dispose() }
}
```

---

## v0.2.5b — Examples Already Done

- `28-parallel-particles` — 20k GPU particles + worker scheduling ✅
- `29-cinematic-camera` — director-driven 6-behavior camera tour ✅
- `30-deferred-pipeline` — geometry → bright → blur → composite → tonemap ✅
- `31-ray-tracer` — interactive progressive path tracer with orbit camera ✅
