/**
 * detect — Capability detection for renderer backends and WASM features.
 *
 * Returns structured info that createEngine uses to decide what to load.
 *
 * @depends types.js
 */

/**
 * Detect renderer backend from a canvas element.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} [opts]
 * @returns {import('./types.js').RendererInfo}
 */
export function detectRenderer(canvas, opts = {}) {
  const glOpts = {
    antialias: opts.antialias !== false,
    alpha: opts.alpha !== true,
    powerPreference: opts.powerPreference || 'high-performance',
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
  }

  // Try WebGL 2.0
  const gl = canvas.getContext('webgl2', glOpts)
  if (gl) {
    return {
      backend: 'webgl2',
      capabilities: {
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
        maxAnisotropy: gl.getExtension('EXT_texture_filter_anisotropic')
          ? gl.getParameter(gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT)
          : 1,
        floatTextures: !!gl.getExtension('EXT_color_buffer_float'),
        depthTexture: true, // WebGL2 requires this
        instancedArrays: true, // WebGL2 requires this
      },
      width: canvas.width,
      height: canvas.height,
    }
  }

  // Try WebGPU (future)
  // const adapter = await navigator.gpu?.requestAdapter()
  // if (adapter) return { backend: 'webgpu', capabilities: {...}, ... }

  // Fallback: 2D
  const ctx2d = canvas.getContext('2d')
  if (ctx2d) {
    return {
      backend: '2d',
      capabilities: {},
      width: canvas.width,
      height: canvas.height,
    }
  }

  throw new Error('No renderer backend available — canvas returned null for webgl2, webgpu, and 2d')
}

/**
 * Detect WASM capabilities (called once at init).
 * @returns {Object}
 */
export function detectWASM() {
  const result = {
    baseline: false,
    simdAvailable: false,
    threadsAvailable: false,
    tier: /** @type {'none'|'base'|'simd'|'full'} */ ('none'),
  }

  // Baseline WASM
  if (typeof WebAssembly === 'undefined') return result
  result.baseline = true
  result.tier = 'base'

  // SIMD detection: validate a module with a v128 type
  try {
    const simdBytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // magic
      0x01, 0x00, 0x00, 0x00, // version
      0x01, 0x05, 0x01,        // type section: 1 type
      0x60, 0x00, 0x01, 0x7b,  // () -> v128
    ])
    if (WebAssembly.validate(simdBytes)) {
      result.simdAvailable = true
      result.tier = 'simd'
    }
  } catch (_) { /* SIMD not available */ }

  // Threads: SharedArrayBuffer + Atomics
  if (typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined') {
    result.threadsAvailable = true
    if (result.simdAvailable) {
      result.tier = 'full'
    }
  }

  return result
}

/**
 * Detect if cross-origin isolation is active (needed for SharedArrayBuffer).
 * @returns {boolean}
 */
export function detectCOOP() {
  return typeof SharedArrayBuffer !== 'undefined' &&
         typeof Atomics !== 'undefined' &&
         typeof Atomics.wait === 'function'
}

export default { detectRenderer, detectWASM, detectCOOP }
