# uploop-ge — Architecture

## Overview

`uploop-ge` is a WebGL/WebGPU graphics engine built on the HyperGraph execution model. Everything — game loops, entities, transforms, shaders, materials — is an inspectable graph of typed nodes.

```
event → GameLoop update handler → state patch → render(state, alpha) → GPU draw
                                                      ↓
                                              subscribers notified
```

---

## Core Loop: createGameLoop

Every example, every scene, every simulation runs on the same pattern:

```js
const loop = createGameLoop({
  state: { ... },                        // initial state (becomes graph nodes)
  update: { tick(s, dt) { ... } },       // fixed-timestep handlers
  render: (state, alpha) => { ... },     // display-refresh drawing
  fixedTimestep: 1/60,                   // physics/update rate
  interpolation: true,                   // smooth between fixed steps
})

loop.start()
loop.send('event', ...args)
loop.subscribe(s => { /* state changed */ })
loop.describe()  // → HyperGraph manifest
loop.dispose()
```

### Frame Pipeline

```
requestAnimationFrame(timestamp)
    │
    ▼ ms→seconds conversion
    │
    ▼ accumulator += dt
    │
    ▼ while accumulator >= fixedTimestep:
    │     _fixedUpdate(dt)  →  handlers mutate state
    │     accumulator -= fixedTimestep
    │
    ▼ render(state, alpha)
    │
    ▼ notify subscribers
```

---

## Package Architecture

```
@uploop/math          Pure math (Vec2/3/4, Mat3/4, Quat, Color, Ray, AABB, Spline)
    ↑
@uploop/geometry      Mesh, VertexFormat, primitives (Cube, Sphere, Plane, etc.), BVH
    ↑
@uploop/shader        GLSL compiler, Material, UniformBlock, built-in shaders (Phong, PBR, PostFX)
    ↑
@uploop/renderer      WebGL2 context, Pipeline, Framebuffer, Texture, Buffer, Draw commands
    ↑
@uploop/resources     Texture atlas, BufferPool, GLTF/OBJ loader, ResourceCache
    ↑
@uploop/scene         GameLoop, Entity, Transform, Camera, Light, Scene, Culling, Sorting, Batching
    ↑
@uploop/anim          KeyframeClip, Animator — animation clips with step/linear/cubic interpolation
@uploop/tween         Tween, TweenManager — property tweening with easing, yoyo, repeat
@uploop/physics       RigidBody, colliders (sphere/box/plane), SAT collision, impulse resolution
```

---

## Entity Component System (ECS)

ECS is not a separate package — it's a pattern built on `createGameLoop`:

```js
const world = {
  entities: new Map(),
  components: {
    transform: new Map(),   // Transform instance per entity
    render: new Map(),      // { meshId, material }
    physics: new Map(),     // { velocity, mass }
    lifetime: new Map(),    // { remaining }
    health: new Map(),      // { current, max }
    pickup: new Map(),      // true
  },
  createEntity(components) { ... },
  destroyEntity(id) { ... },
  query(...componentNames) { ... },
}

// Systems are pure functions called in the tick/render loop
function physicsSystem(world, dt) { ... }
function lifetimeSystem(world, dt) { ... }
function renderSystem(world, gl, camera) { ... }
```

---

## Transform Hierarchy

```
Transform {
  position: Vec3 (local)
  rotation: Quat (local)
  scale:    Vec3 (local)
  parent:   Transform | null
  children: Transform[]

  get localMatrix()    — compose(position, rotation, scale), cached via dirty flag
  get worldMatrix()    — parent.worldMatrix × localMatrix, cached and propagated
  get worldPosition()  — extract translation from worldMatrix
}
```

Dirty flag propagation: when `localMatrix` is recomputed, `worldDirty` is set on self and all children. Accessing `worldMatrix` on a child triggers lazy recomputation up the ancestor chain.

---

## Render Pipeline

```
Canvas → createContext(canvas) → { gl, backend, width, height }
    ↓
shader = createProgram(gl, vertexSrc, fragmentSrc)
    ↓
mesh = createCube(1)  // → { vertices: Float32Array, indices: Uint16Array, format: PNU }
    ↓
vao = setupVAO(gl, shader, mesh)  // binds attributes from shader → mesh format
    ↓
pipeline = createPipeline(gl, { shader, vertexFormat, state })
    ↓
// Per frame:
pipeline.bind()
pipeline.setVertexBuffer(vbo)
pipeline.setUniform('uModel', modelMatrix)
pipeline.setUniform('uView', viewMatrix)
pipeline.setUniform('uProjection', projectionMatrix)
drawIndexed(gl, { count: mesh.indexCount })
```

---

## Post-Processing Pipeline

```
1. Render scene to Framebuffer A (color + depth)
2. Bright-pass: render A → B (extract bright areas)
3. Blur pass: B horizontal → C, C vertical → B (gaussian blur)
4. Composite: A + (B × bloomStrength) → D
5. Tonemap: D → screen (ACES filmic + gamma correction)
```

Built-in post-FX shaders are in `builtinShaders.post`.

---

## Data Flow Summary

```
User Input (mouse, keyboard)
    ↓
gameLoop.send(event, ...args)
    ↓
update handler(state, ...args) → partial state
    ↓
state merged (immutable pattern)
    ↓
render(state, alpha) called at display refresh
    ↓
GPU draw commands issued via pipeline
    ↓
subscribers notified (UI overlays, debug panels)
```
