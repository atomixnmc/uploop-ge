# uploop-ge — Planning

## Package Map

```
uploop-ge/packages/
├── math            ← Vec2/3/4, Mat3/4, Quat, Euler, Color, Ray, AABB, Spline
├── geometry        ← VertexFormat, Mesh, primitives, BVH
├── shader          ← GLSL/WGSL compiler, Material, UniformBlock, built-ins
├── renderer        ← WebGL 2.0 + WebGPU backend, Pipeline, Framebuffer, Draw
├── scene           ← GameLoop, Entity, Transform, Camera, Light, Scene, Culling
└── resources       ← TextureAtlas, BufferPool, AssetLoader, ResourceCache
```

## Dependency Graph

```
@uploop/math              ← no deps
@uploop/geometry          ← @uploop/math
@uploop/shader            ← @uploop/math
@uploop/resources         ← @uploop/math
@uploop/renderer          ← @uploop/math, @uploop/shader, @uploop/resources, @uploop/geometry
@uploop/scene             ← @uploop/core, @uploop/math, @uploop/renderer, @uploop/geometry
```

## Game Loop Design

`@uploop/scene` provides `createGameLoop()` — a dedicated game loop wrapping
`@uploop/core` primitives (`createLoop`/`createGraph`) with:

- **Fixed timestep** — physics/update runs at constant rate
- **Render interpolation** — smooth rendering between fixed steps via `alpha` factor
- **Frame budget** — drop frames if render exceeds budget
- **Built-in systems** — frustum culling, painter's/depth sorting, instance batching
- **HyperGraph native** — entities are graph nodes, inspectable, traceable

```js
const game = createGameLoop({
  fixedTimestep: 1/60,
  state: { entities: [], camera: {...} },
  update: {
    tick: (state, dt) => ({...}),
    spawnEntity: (state, config) => ({...}),
  },
  render: (state, alpha) => { /* draw at display refresh */ },
})
```

## Implementation Phases

| Phase | Scope | Status |
|---|---|---|
| P0 | Scaffolding, @uploop/math, docs | 🟡 scaffolding done |
| P1 | @uploop/geometry, @uploop/shader | ⬜ |
| P2 | @uploop/renderer (WebGL), @uploop/resources | ⬜ |
| P3 | @uploop/scene + createGameLoop(), entity system | ⬜ |
| P4 | Built-in shaders (Phong, PBR), WebGPU backend | ⬜ |
| P5 | GLTF loader, texture atlases, BVH | ⬜ |
| P6 | Examples (triangle → textured cube → scene demo) | ⬜ |

## Key Design Decisions

1. **Float32Array for math** — zero-copy GPU upload, column-major matrices
2. **WebGPU-first, WebGL fallback** — auto-select with capabilities check
3. **Renderer is backend-agnostic** — same API for WebGL 2.0 and WebGPU
4. **Game loop is HyperGraph-native** — wraps @uploop/core, not a separate runtime
5. **Pure ESM, no build** — just like uploopjs
