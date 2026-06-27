/**
 * @uploop/engine — Types
 *
 * @typedef {Object} EngineConfig
 * @property {HTMLCanvasElement} canvas
 * @property {Object} [wasm]
 * @property {boolean} [wasm.enabled=false]
 * @property {string[]|'all'} [wasm.packages=['all']]
 * @property {'auto'|'js-only'|'wasm-required'} [wasm.fallback='auto']
 * @property {Object} [wasm.physics] — pool sizing overrides
 * @property {number} [wasm.physics.maxBodies]
 * @property {number} [wasm.physics.maxContacts]
 * @property {Object} [wasm.bvh]
 * @property {number} [wasm.bvh.maxTriangles]
 * @property {Object} [wasm.math]
 * @property {number} [wasm.math.workspaceSize]
 * @property {Object} [renderer]
 * @property {'auto'|'webgl2'|'webgpu'} [renderer.backend='auto']
 * @property {boolean} [renderer.antialias=true]
 * @property {boolean} [renderer.alpha=false]
 * @property {string} [renderer.powerPreference='high-performance']
 * @property {Object} [loop]
 * @property {number} [loop.fixedTimestep=1/60]
 * @property {number} [loop.maxFrameBudget=16]
 * @property {boolean} [loop.interpolation=true]
 *
 * @typedef {Object} WASMInfo
 * @property {boolean} enabled
 * @property {string} tier — 'full'|'simd'|'base'|'none'
 * @property {boolean} simdAvailable
 * @property {boolean} threadsAvailable
 * @property {Object|null} math
 * @property {Object|null} physics
 * @property {Object|null} bvh
 * @property {Object|null} geometry
 * @property {Object|null} raytracer
 *
 * @typedef {Object} RendererInfo
 * @property {string} backend — 'webgl2'|'webgpu'|'2d'
 * @property {Object} capabilities
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} Engine
 * @property {HTMLCanvasElement} canvas
 * @property {WebGL2RenderingContext|null} gl
 * @property {RendererInfo} renderer
 * @property {WASMInfo|null} wasm
 * @property {string[]} warnings
 * @property {Function} describe
 * @property {Function} dispose
 */
