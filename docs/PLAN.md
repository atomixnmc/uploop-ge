# uploop-ge — Planning

## Status: v0.2.1 active, v0.3 planned

| Phase | Scope | Status |
|-------|-------|--------|
| v0.1.x | Core packages (math, geometry, shader, renderer, scene, resources, anim, tween, physics, game-ui, loaders), 27 examples | ✅ done |
| v0.2.1 | `@uploop/parallel`, orchestrator, worker pool, task scheduler | ✅ done |
| v0.2.2 | `@uploop/director`, cinematic camera, behaviors, constraints | ✅ done |
| v0.2.3 | `@uploop/custom-pipeline`, multi-pass, deferred, post-FX presets | ✅ done |
| v0.2.4 | `@uploop/ray-tracing`, BVH, Möller–Trumbore, path tracer | ✅ done |
| v0.2.5 | Advanced examples 28–31, EngineConfig init system | 🟡 in progress |
| v0.3.1 | `wams-math` — WASM vec3/mat4/quat/aabb | ⬜ planned |
| v0.3.2 | `wams-physics` — WASM broadphase/narrowphase/solver | ⬜ planned |
| v0.3.3 | `wams-bvh` — WASM BVH builder/traverser | ⬜ planned |
| v0.3.4 | `wams-geometry` — WASM skinning/morph/simplify | ⬜ planned |
| v0.3.5 | `wams-raytracer` — WASM path tracer | ⬜ planned |
| v0.3.6 | WAMS integration examples 32–35 | ⬜ planned |

## Package Map

```
uploop-ge/
├── packages/
│   ├── math            ← Vec2/3/4, Mat3/4, Quat, Euler, Color, Ray, AABB, Spline
│   ├── geometry        ← VertexFormat, Mesh, primitives (Cube, Sphere, Plane), BVH
│   ├── shader          ← GLSL compiler, Material, UniformBlock, built-in shaders
│   ├── renderer        ← WebGL 2.0 backend, Pipeline, Framebuffer, Draw
│   ├── scene           ← GameLoop, Entity, Transform, Camera, Light, Scene, Culling
│   ├── resources       ← TextureAtlas, BufferPool, ResourceCache
│   ├── anim            ← KeyframeClip, Animator, blend trees
│   ├── tween           ← Tween, TweenManager, easing, sequences
│   ├── physics         ← RigidBody, colliders, SAT, impulse resolution
│   ├── game-ui         ← WebGL UI components, layout, styling
│   ├── loaders         ← OBJ, GLTF 2.0, texture, cubemap
│   ├── parallel        ← Web Worker pool, task scheduler, SharedArrayBuffer
│   ├── director        ← Cinematic camera, behaviors, constraints, timelines
│   ├── custom-pipeline ← Pluggable render pipeline, deferred, post-FX
│   └── ray-tracing     ← Software ray tracing, BVH, path tracer
└── wams-packages/      ← v0.3.x AssemblyScript WASM modules
    ├── wams-math       ← WASM vec3/mat4/quat ops
    ├── wams-physics    ← WASM broadphase/narrowphase/solver
    ├── wams-bvh        ← WASM BVH build/traverse
    ├── wams-geometry   ← WASM skinning/morph/decimation
    └── wams-raytracer  ← WASM path tracer

examples/               ← 31 interactive demos
docs/plan/              ← versioned planning docs
```

## EngineConfig (v0.2.5)

Single init entry point that auto-detects capabilities and wires up WASM:

```js
const engine = await createEngine({
  canvas,
  wasm: { enabled: true, packages: ['physics', 'bvh'], fallback: 'auto' },
  renderer: { backend: 'auto' },
})
```

See `packages/engine/` for full implementation.

## Key Design Decisions

1. **Float32Array for math** — zero-copy GPU upload, column-major matrices
2. **WebGL2-first, WebGPU planned** — auto-select with capabilities check
3. **createGameLoop is the core primitive** — fixed timestep, render interpolation
4. **ECS built on game loop state** — entities array, component Maps, systems as update/render
5. **WASM is opt-in compute co-processor** — JS orchestrates, WASM accelerates hot loops
6. **HyperGraph everywhere** — every component has `describe()` returning typed nodes
7. **Pure ESM, no build for JS** — Vite for dev, AssemblyScript for WASM only
