# uploop-ge — TODO

## Phase 0 — Scaffolding ✅

- [x] Directory structure
- [x] Root package.json + pnpm-workspace.yaml
- [x] Vite + Vitest configs
- [x] Package stubs (9 packages)
- [x] README

## Phase 1 — @uploop/math ✅

- [x] vec2.js — create, add, sub, scale, dot, cross, normalize, length, distance
- [x] vec3.js — same + cross
- [x] vec4.js — homogeneous ops
- [x] mat3.js — identity, multiply, transpose, inverse, scale, rotate, translate
- [x] mat4.js — identity, multiply, transpose, inverse, lookAt, perspective, ortho
- [x] quat.js — fromAxisAngle, fromEuler, slerp, multiply, conjugate, normalize
- [x] euler.js — toQuat, toMat4, fromQuat
- [x] color.js — RGBA, hex, HSL, linear/sRGB conversions
- [x] ray.js — origin+direction, intersect plane/sphere/AABB/triangle
- [x] plane.js — fromPoints, distanceToPoint, intersect
- [x] aabb.js — fromPoints, union, intersection, contains, expand
- [x] spline.js — Catmull-Rom, Bezier
- [x] interpolate.js — lerp, slerp, smoothstep, easing fns
- [x] Unit tests (25)

## Phase 2 — @uploop/geometry ✅

- [x] VertexFormat — attribute layout, stride calculation
- [x] Mesh — vertices + indices + format + drawMode
- [x] Primitives — cube, sphere (UV sphere), plane, cylinder, torus
- [x] Buffer helpers — interleave, deserialize
- [x] BVH — build from mesh, AABB query
- [x] Unit tests (13)

## Phase 3 — @uploop/shader ✅

- [x] GLSL compiler — compile, link, detect uniforms/attributes
- [x] WGSL compiler scaffold
- [x] Material — shader + uniform values + render state
- [x] UniformBlock — typed uniform descriptor, upload
- [x] AttributeLayout — per-vertex attribute binding
- [x] Built-in: unlit (flat color + texture)
- [x] Built-in: Phong (ambient + diffuse + specular)
- [x] Built-in: PBR (metallic-roughness)
- [x] Built-in: post-FX (bloom, blur, tonemap)
- [x] Unit tests (8)

## Phase 4 — @uploop/renderer ✅

- [x] Context — canvas → WebGL2/WebGPU auto-select
- [x] Pipeline — shader + vertex format + state = render state
- [x] Framebuffer — color/depth attachments, MRT
- [x] Texture — 2D, cubemap, mipmaps, samplers
- [x] Buffer — vertex, index, uniform, storage
- [x] Draw — draw, drawIndexed, drawInstanced
- [x] WebGL 2.0 backend implementation
- [ ] WebGPU backend scaffold
- [x] Unit tests (4)

## Phase 5 — @uploop/scene ✅

- [x] createGameLoop() — fixed timestep + render interpolation
- [x] Entity — id, transform, mesh, material, components
- [x] Transform — position, rotation, scale, parent/child, localToWorld
- [x] Camera — perspective, orthographic, lookAt, frustum planes
- [x] Light — directional, point, spot, ambient
- [x] Scene — add/remove, query by tag/type
- [x] Culling — frustum culling as graph optimization node
- [x] Sorting — painter's algorithm, material grouping
- [x] Batching — instance batching, draw-call dedup
- [x] Unit tests (22)

## Phase 5.5 — Animation, Tween & Physics ✅

- [x] @uploop/anim — KeyframeClip, Animator, easing lookup
- [x] @uploop/tween — property tweening with easing, yoyo, repeat, TweenManager
- [x] @uploop/physics — RigidBody, colliders (sphere/box/plane), SAT collision, impulse resolution

## Phase 6 — @uploop/resources ✅

- [x] Texture loading — image, HDR, cubemap
- [x] Texture atlas — rectangle packing
- [x] BufferPool — reuse buffers by size
- [x] DynamicBufferRing — per-frame sub-allocation
- [x] Asset loader — GLTF, OBJ, image, shader source
- [x] ResourceCache — LRU with TTL

## Phase 7 — Examples ✅

- [x] Demo gallery with filter tabs (All, Core, 3D, 2D, Game)
- [x] 01-game-loop — State→Update→Render architecture
- [x] 02-entities — Entity lifecycle through the loop
- [x] 03-ecs — Entity Component System (Transform, Render, Physics, Lifetime, Health)
- [x] 04-scenegraph — Solar system with Transform parent-child hierarchy
- [x] 05-materials — Declarative PBR material switching
- [x] 06-camera — Orbit camera system through the loop
- [x] 07-physics — Ball physics with fixed timestep + ground collision
- [x] 08-instancing — 1000 cubes in one draw call
- [x] 09-triangle — Pure WebGL with rainbow hue cycle
- [x] 10-cube — Rotating cube, toggle X/Y/Z axis
- [x] 11-sphere — Lit sphere with orbiting light
- [x] 12-textured — Procedural checkerboard texture
- [x] 13-lighting — Ambient + directional + point light scene
- [x] 14-pbr — PBR roughness×metallic material grid
- [x] 15-particles — 500 instanced GPU particles
- [x] 16-postfx — Framebuffer bloom + tonemap pipeline
- [x] 17-skybox — Procedural cubemap + reflective sphere
- [x] 18-animation — Procedural character animation (limbs, bob)
- [x] 19-sprites — 2D Canvas sprite batching
- [x] 20-tilemap — 2D tilemap with camera scroll
- [x] 21-breakout — Breakout game with paddle/bricks/lives
- [x] 22-platformer — Platformer with coins + gravity

## Stats

- **Packages:** 9
- **Source modules:** ~55
- **Examples:** 22 (19 WebGL + 3 Canvas 2D)
- **Unit tests:** 72
