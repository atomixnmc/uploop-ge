/**
 * @uploop/engine — One-call engine init with auto-detection.
 *
 * Detects WebGL/WebGPU/WASM capabilities, loads WASM packages on demand,
 * and returns a unified engine object. Every subsystem is a HyperGraph node.
 *
 * Usage:
 *   import { createEngine } from '@uploop/engine'
 *
 *   const engine = await createEngine({
 *     canvas,
 *     wasm: { enabled: true, packages: ['physics'] },
 *   })
 *
 *   console.log(engine.describe())
 */

export { createEngine } from './engine.js'
export { detectRenderer, detectWASM, detectCOOP } from './detect.js'
