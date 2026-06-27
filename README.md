# uploop-ge

WebGL/WebGPU graphics engine from scratch. 2D/3D math, mesh geometry, shader
compilation, renderer abstraction, scene graph with dedicated game loop, GPU
resource management.

Built on the HyperGraph execution model — everything is an inspectable graph
of typed nodes.

## Packages

| Package | Description |
|---------|-------------|
| `@uploop/math` | 2D/3D math — Vec2/3/4, Mat3/4, Quat, Euler, Color, Ray, AABB, Spline |
| `@uploop/geometry` | Mesh, vertex formats, primitives (cube, sphere, plane), BVH |
| `@uploop/shader` | GLSL/WGSL compilation, materials, uniforms, built-in shaders |
| `@uploop/renderer` | WebGL 2.0 + WebGPU backend, render pipeline, framebuffer, draw |
| `@uploop/scene` | Scene graph, game loop (fixed timestep + render interpolation), entities |
| `@uploop/resources` | Texture atlas, buffer pool, asset loader (GLTF, OBJ), resource cache |

## Quick Start

```bash
pnpm install
pnpm dev
```

## License

MIT
