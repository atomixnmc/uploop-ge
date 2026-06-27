# v0.0.1 — Initial Scaffolding & Core Implementation

> **Date:** 2026-06-26
> **Based on:** [PLANNING.md](../PLANNING.md), [ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Phase Summary

| Phase | Package | Status | Tests | Lines |
|---|---|---|---|---|
| P0 | Scaffolding (root + 9 packages) | ✅ | — | ~300 |
| P1 | `@uploop/math` | ✅ | 25 | ~1,920 |
| P2 | `@uploop/geometry` | ✅ | 13 | ~620 |
| P3 | `@uploop/shader` | ✅ | 8 | ~720 |
| P4 | `@uploop/renderer` | ✅ | 4 | ~580 |
| P5 | `@uploop/scene` | ✅ | 22 | ~1,100 |
| P5.5 | `@uploop/anim`, `@uploop/tween`, `@uploop/physics` | ✅ | — | ~900 |
| P6 | `@uploop/resources` | ✅ | — | ~450 |
| P7 | Examples (22) | ✅ | — | ~3,000 |

**Totals:** 9 packages, 72 tests, ~9,600 lines, 22 examples

---

## Package Dependency Graph

```
@uploop/math          ← no deps
@uploop/geometry      ← @uploop/math
@uploop/shader        ← @uploop/math
@uploop/renderer      ← @uploop/math, @uploop/shader, @uploop/resources, @uploop/geometry
@uploop/scene         ← @uploop/math, @uploop/renderer, @uploop/geometry
@uploop/resources     ← @uploop/math, @uploop/geometry
@uploop/anim          ← @uploop/math
@uploop/tween         ← @uploop/math
@uploop/physics       ← @uploop/math, @uploop/scene
```

---

## Key Design Decisions

1. **Float32Array math** — zero-copy GPU upload, column-major matrices
2. **WebGL 2.0 first, WebGPU scaffold** — auto-select with graceful degradation
3. **Renderer is backend-agnostic** — same API for WebGL 2.0 and WebGPU
4. **Game loop wraps HyperGraph concepts** — fixed timestep, render interpolation, `describe()` manifest
5. **Transform dirty-flag caching** — local/world matrix computed lazily, propagated to children
6. **ECS via game loop state** — entities as arrays, components as Maps, systems as update/render functions
7. **Pure ESM, no build** — Vite dev server with package aliases
8. **Hash-based routing in gallery** — shareable URLs (`/#03-ecs`), CSP-safe events
9. **Responsive canvas** — min 720p, DPR-scaled, resize-aware projection

---

## Architecture

### Game Loop

```js
const loop = createGameLoop({
  state: { count: 0 },
  update: {
    tick: (s, dt) => ({ count: s.count + 1 }),
  },
  render: (state, alpha) => { /* draw */ },
})
loop.describe()  // → HyperGraph manifest
```

### ECS

```js
const world = {
  entities: new Map(),
  components: { transform: new Map(), render: new Map(), physics: new Map() },
  createEntity(comps) { ... },
  query(...names) { ... },
}
```

### Transform Hierarchy

```js
parent.addChild(child)
child.worldPosition  // → auto-computed via matrix chain
```

---

## 22 Examples

| # | ID | Type | Uploop Concept |
|---|---|---|---|
| 01 | game-loop | Core | State → Update → Render |
| 02 | entities | Core | Entity lifecycle through the loop |
| 03 | ecs | Core | Full ECS: 6 component types, 3 systems |
| 04 | scenegraph | Core | Transform parent-child hierarchy |
| 05 | materials | 3D | Declarative material switching |
| 06 | camera | 3D | Orbit camera via loop state |
| 07 | physics | 3D | Fixed-timestep physics |
| 08 | instancing | 3D | Instance batching |
| 09-13 | triangle…lighting | 3D | Geometry, textures, lights |
| 14 | pbr | 3D | PBR material grid |
| 15 | particles | 3D | GPU particles |
| 16 | postfx | 3D | Framebuffer pipeline |
| 17 | skybox | 3D | Cubemap + reflections |
| 18 | animation | 3D | Procedural character animation |
| 19-20 | sprites, tilemap | 2D | Canvas 2D with game loop |
| 21-22 | breakout, platformer | Game | Complete games via the loop |

---

## Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| 2D examples not rendering | rAF ms/seconds unit mismatch | Convert `timestamp / 1000` |
| Example switch leaves old loop | No cleanup return from `init()` | Return `() => { loop.stop() }` |
| `@uploop/*` imports fail | Missing workspace symlinks | Vite aliases |
| OrthographicCamera broken | `Object.assign` on getters | Standalone factory |
| Transform hierarchy wrong | Closure shadowing | `this._dirty` properties |

---

## Next: v0.0.2

| Task | Priority |
|---|---|
| WebGPU backend | Medium |
| GLTF full parser (draco, extensions) | Medium |
| Scene ↔ `@uploop/core` integration | High |
| `uploop-vided` initial implementation | High |
| Physics + animation tests | Medium |
| CI/CD pipeline | Medium |
