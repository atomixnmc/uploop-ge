# uploop-ge — v0.2.x Planning

## v0.2.1 — @uploop/parallel

Parallel execution & task scheduler for compute-heavy workloads.

### Concepts (Uploop-style)
- **Task** = state node: `{ id, fn, input, output, priority, status }`
- **WorkerPool** = executor node with worker graph edges
- **Scheduler** coordinates tasks → workers, balancing load
- **SharedBuffer** for zero-copy state sharing between main <-> worker
- **describe()** reveals the work graph: tasks, workers, queues

### API Sketch
```js
import { createWorkerPool, createTask, createScheduler } from '@uploop/parallel'

const pool = createWorkerPool({ workers: 4, source: './worker.js' })
const scheduler = createScheduler({ pool, maxConcurrent: 4 })

const task = createTask({
  name: 'particle-integrate',
  fn: (data) => { /* heavy compute */ },
  data: particleData.buffer,       // Transferable
  priority: 1,
})

scheduler.schedule(task)
scheduler.subscribe(stats => { /* idle, running, queued counts */ })
console.log(scheduler.describe())  // → HyperGraph manifest
```

### Dependencies
- None (self-contained Web Worker + Scheduler)

---

## v0.2.2 — @uploop/director

Cinematic camera flows, object movement with constraints.

### Concepts
- **Behavior** = state node: `{ type: 'dolly'|'orbit'|'track'|..., params, progress }`
- **Constraint** = edge restricting movement (path, bounds, look-at)
- **Timeline** = sequence of behaviors with timing/easing
- **Transition** = blend between two camera setups

### API Sketch
```js
import { createDirector, dolly, orbit, track, lookAt } from '@uploop/director'

const director = createDirector({ camera, target })

director.play(timeline([
  dolly({ from: [0,2,5], to: [3,1,2], duration: 2, easing: 'easeInOutCubic' }),
  orbit({ target: [0,1,0], speed: 0.5, duration: 3 }),
  track({ path: bezierPoints, duration: 4 }),
]))

director.update(dt)   // call in game loop tick
console.log(director.describe())
```

### Dependencies
- `@uploop/math` (Vec3, Quat, Mat4, Spline)
- `@uploop/scene` (game loop integration)

---

## v0.2.3 — @uploop/custom-pipeline

Pluggable render pipeline with injectable stages.

### Concepts
- **Stage** = render pass node: `{ name, shader, inputs, outputs, enabled }`
- **Pipeline** = ordered DAG of stages with framebuffer edges
- **Attachment** = texture node flowing between stages
- **Inject** = hook point for custom logic

### API Sketch
```js
import { createPipeline, createStage, createAttachment } from '@uploop/custom-pipeline'

const gBuffer = createAttachment({ type: 'color+depth', format: 'rgba16f' })
const lightBuffer = createAttachment({ type: 'color', format: 'rgba16f' })

const pipeline = createPipeline({
  stages: [
    createStage({ name: 'geometry', shader: gBufferShader, outputs: [gBuffer] }),
    createStage({ name: 'lighting', shader: deferredLight, inputs: [gBuffer], outputs: [lightBuffer] }),
    createStage({ name: 'postfx', shader: tonemapShader, inputs: [lightBuffer] }),
  ]
})

pipeline.render(scene, camera)
```

### Dependencies
- `@uploop/renderer`
- `@uploop/shader`

---

## v0.2.4 — @uploop/ray-tracing

Software ray tracing with BVH acceleration.

### Concepts
- **Ray** = query node: `{ origin, direction, tMin, tMax }`
- **Hit** = result node: `{ position, normal, t, material, entity }`
- **Scene** = BVH of geometry nodes
- **Tracer** = dispatches rays, collects hits

### API Sketch
```js
import { createRayTracer, createRay, buildBVH } from '@uploop/ray-tracing'

const bvh = buildBVH(scene.entities.filter(e => e.mesh))
const tracer = createRayTracer({ bvh, maxDepth: 4 })

const ray = createRay({ origin: camPos, direction: camDir })
const hit = tracer.trace(ray)
// hit = { position, normal, t, material, entity }

// For path tracing:
const result = tracer.pathTrace(ray, {
  maxDepth: 4,
  samples: 64,
  onSample: (color) => { /* accumulate */ }
})
```

### Dependencies
- `@uploop/math` (Vec3, Ray, AABB)
- `@uploop/geometry` (BVH builder)

---

## v0.2.5 — Advanced Examples

New examples showcasing combined usage:
- `28-parallel-particles` — 50k GPU particles + worker physics
- `29-cinematic-camera` — director-driven camera tour
- `30-deferred-pipeline` — custom deferred rendering
- `31-ray-tracer` — interactive software path tracer
- `32-full-pipeline` — all packages combined
