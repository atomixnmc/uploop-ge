<p align="center">
  <img src="assets/logo.svg" alt="uploop-ge" width="480">
</p>

<p align="center">
  <a href="https://github.com/atomixnmc/uploop-ge/actions/workflows/ci.yml"><img src="https://github.com/atomixnmc/uploop-ge/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/atomixnmc/uploop-ge/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/atomixnmc/uploop-ge"><img src="https://img.shields.io/github/v/tag/atomixnmc/uploop-ge?label=version" alt="Version"></a>
  <a href="https://atomixnmc.github.io/uploop-ge"><img src="https://img.shields.io/badge/demo-live-4fc3f7.svg" alt="Demo"></a>
  <a href="https://github.com/atomixnmc/uploopjs"><img src="https://img.shields.io/badge/uploopjs-core-6cf.svg" alt="uploopjs"></a>
</p>

---

**uploop-ge** is a WebGL/WebGPU graphics &amp; game engine built on the
[Uploop](https://github.com/atomixnmc/uploopjs) HyperGraph architecture.  
Everything is a typed, inspectable graph node — state, updates, render,
entities, transforms, materials, physics.

## Architecture

```
state  →  update (fixed 1/60 timestep)  →  render (interpolated)
  ↑                    │                        │
  └──── send(event) ───┘                        │
                                                ↓
                                     subscribe(st) → DOM / GPU
```

Every example in the gallery **is** a HyperGraph component. Open the
console and run `__gallery.describe()` to see the typed graph.

## Packages

| Package | Description | Tests |
|---------|-------------|-------|
| `@uploop/math` | Vec2/3/4, Mat3/4, Quat, Euler, Color, Ray, AABB, Spline | 25 |
| `@uploop/geometry` | Mesh, vertex formats (PNU), primitives, BVH | 13 |
| `@uploop/shader` | GLSL compilation, materials, uniforms, built-in shaders | 8 |
| `@uploop/renderer` | WebGL 2.0 backend, framebuffer, draw pipeline | 4 |
| `@uploop/scene` | Game loop, ECS, Transform hierarchy, Camera, Light, culling | 22 |
| `@uploop/resources` | Texture atlas, buffer pool, asset cache | — |
| `@uploop/anim` | Keyframe clips, animator, blend trees | — |
| `@uploop/tween` | Tween engine, interpolation, sequencing | — |
| `@uploop/physics` | Rigid bodies, colliders, SAT, world stepping | — |
| `@uploop/game-ui` | WebGL UI components — Button, Slider, Toggle, Panel, layout | 25 |
| `@uploop/loaders` | OBJ, GLTF 2.0, texture, cubemap loading | — |

**97 unit + 10 e2e tests** — [CI runs on every push](https://github.com/atomixnmc/uploop-ge/actions).

## Quick Start

```bash
git clone https://github.com/atomixnmc/uploop-ge.git
cd uploop-ge
pnpm install
pnpm dev          # → http://localhost:3001 — 27 interactive examples
pnpm test         # vitest (unit)
pnpm test:e2e     # playwright (e2e)
```

**Live demo**: [atomixnmc.github.io/uploop-ge](https://atomixnmc.github.io/uploop-ge)

## Examples

27 examples covering the full pipeline:

| # | Example | Category |
|---|---------|----------|
| 01–04 | Game Loop, Entity Spawner, ECS, SceneGraph | **Core architecture** |
| 05–18 | Materials, Camera, Physics, Instancing, Triangle→PostFX, Skybox, Animation | **3D pipeline** |
| 19–25 | Sprites, Tilemap, Breakout, Platformer, Snake, Pong, Asteroids | **2D / Games** |
| 26–27 | Static Model Viewer, Animated Model | **Model loaders** |

Open `http://localhost:3001` for the gallery. Hash-route directly:
`/#01-game-loop`, `/#19-sprites`, etc.

## HyperGraph Concept

```js
import { createGameLoop } from "@uploop/scene";

const loop = createGameLoop({
  name: "my-game",
  state: { count: 0 },

  update: {
    tick(s, dt) {
      return { count: s.count + dt };
    },
    add(s, n) {
      return { count: s.count + n };
    },
  },

  render(state, alpha) {
    console.log("render at", state.count + alpha * loop.fixedTimestep);
  },
});

loop.start();
loop.send("add", 5);           // state changes only through events
loop.subscribe((s) => { ... }); // reactive state observer
console.log(loop.describe());   // inspectable HyperGraph manifest
```

**No classes. No decorators. No DI.** Just factory functions, typed state,
and a single-direction data flow. The loop is its own HyperGraph node.

## Related

- [uploopjs](https://github.com/atomixnmc/uploopjs) — the core HyperGraph framework
- [uploop-vided](https://github.com/atomixnmc/uploop-vided) — generative AI compositor / VFX engine

## License

MIT © [atomixnmc](https://github.com/atomixnmc)
