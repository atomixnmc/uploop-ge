/**
 * @uploop/wams-math — WASM-accelerated math operations.
 *
 * Provides batch vec3/mat4/quat/aabb operations. Falls back to JS
 * when WASM is unavailable.
 */
export { createMathJS } from './fallback.js'
