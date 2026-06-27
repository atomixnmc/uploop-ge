/**
 * createEngine — One-call init: detect renderer, opt into WASM, return unified engine.
 *
 * The engine is the HyperGraph root node. All subsystems (renderer, WASM
 * modules, game loop) appear as child nodes in describe().
 *
 * @depends types.js, detect.js
 */
import { detectRenderer, detectWASM } from './detect.js'

/**
 * @param {import('./types.js').EngineConfig} config
 * @returns {Promise<import('./types.js').Engine>}
 */
export async function createEngine({
  canvas,
  wasm: wasmConfig,
  renderer: rendererConfig = {},
  loop: loopConfig = {},
} = {}) {
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('createEngine: "canvas" (HTMLCanvasElement) is required')
  }

  /** @type {string[]} */
  const warnings = []

  // ═══════════════════════════════════════════════════════════════
  // 1. Renderer detection
  // ═══════════════════════════════════════════════════════════════
  const renderer = detectRenderer(canvas, rendererConfig)
  const gl = renderer.backend === 'webgl2' ? canvas.getContext('webgl2') : null

  if (renderer.backend === '2d') {
    warnings.push('No WebGL2 — falling back to 2D canvas')
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. WASM detection + loading
  // ═══════════════════════════════════════════════════════════════
  let wasm = null

  if (wasmConfig?.enabled) {
    const caps = detectWASM()
    const fallback = wasmConfig.fallback || 'auto'

    if (caps.tier === 'none') {
      if (fallback === 'wasm-required') {
        throw new Error('WASM required but not available in this browser')
      }
      warnings.push('WASM not available — using JS fallback')
    } else {
      const requested = wasmConfig.packages === 'all'
        ? ['math', 'physics', 'bvh', 'geometry', 'raytracer']
        : (wasmConfig.packages?.length ? wasmConfig.packages : ['math'])

      try {
        wasm = await loadWASMPackages(requested, caps, wasmConfig)
        if (wasm) {
          wasm.enabled = true
          wasm.tier = caps.tier
          wasm.simdAvailable = caps.simdAvailable
          wasm.threadsAvailable = caps.threadsAvailable
        }
      } catch (err) {
        if (fallback === 'wasm-required') {
          throw new Error(`WASM load failed (required): ${err.message}`)
        }
        warnings.push(`WASM load failed — using JS fallback: ${err.message}`)
        wasm = null
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. Build engine object
  // ═══════════════════════════════════════════════════════════════
  /** @type {import('./types.js').Engine} */
  const engine = {
    canvas,
    gl,
    renderer,
    wasm,
    warnings,

    /** HyperGraph manifest */
    describe() {
      const nodes = [
        { id: 'engine.renderer', kind: 'renderer', backend: renderer.backend },
      ]
      if (wasm) {
        nodes.push({ id: 'engine.wasm', kind: 'wasm', tier: wasm.tier })
        for (const pkg of ['math', 'physics', 'bvh', 'geometry', 'raytracer']) {
          if (wasm[pkg]) {
            nodes.push({ id: `engine.wasm.${pkg}`, kind: 'wasm-module' })
          }
        }
      }
      return {
        kind: 'uploop.engine',
        name: 'Engine',
        renderer: renderer.backend,
        wasmTier: wasm?.tier || 'none',
        nodes,
        edges: wasm ? [
          { from: 'engine.wasm', to: 'engine.renderer', kind: 'feeds' },
        ] : [],
      }
    },

    /** Dispose all subsystems */
    dispose() {
      // WASM memory would be freed here if needed
      // Renderer cleanup
      if (gl) {
        const loseContext = gl.getExtension('WEBGL_lose_context')
        if (loseContext) loseContext.loseContext()
      }
    },
  }

  return engine
}

// ═══════════════════════════════════════════════════════════════
// Internal: WASM package loader
// ═══════════════════════════════════════════════════════════════

/**
 * Load requested WASM packages with capability tiering.
 * @param {string[]} packages
 * @param {Object} caps — from detectWASM()
 * @param {Object} wasmConfig — full wasm config block
 * @returns {Promise<Object|null>}
 */
async function loadWASMPackages(packages, caps, wasmConfig) {
  const wasmObj = { enabled: true }

  for (const pkg of packages) {
    switch (pkg) {
      case 'math': {
        const mod = await loadTieredModule('wams-math', caps)
        if (mod) wasmObj.math = createMathAPI(mod, wasmConfig.math)
        break
      }
      case 'physics': {
        const mod = await loadTieredModule('wams-physics', caps)
        if (mod) wasmObj.physics = createPhysicsAPI(mod, wasmConfig.physics)
        break
      }
      case 'bvh': {
        const mod = await loadTieredModule('wams-bvh', caps)
        if (mod) wasmObj.bvh = createBVHAPI(mod, wasmConfig.bvh)
        break
      }
      case 'geometry': {
        const mod = await loadTieredModule('wams-geometry', caps)
        if (mod) wasmObj.geometry = createGeometryAPI(mod)
        break
      }
      case 'raytracer': {
        const mod = await loadTieredModule('wams-raytracer', caps)
        if (mod) wasmObj.raytracer = createRaytracerAPI(mod)
        break
      }
      default:
        console.warn(`[uploop-engine] Unknown WASM package: "${pkg}"`)
    }
  }

  return Object.keys(wasmObj).length > 1 ? wasmObj : null
}

/**
 * Load a WASM module with tier fallback.
 * @param {string} name — e.g., 'wams-math'
 * @param {Object} caps
 * @returns {Promise<Object|null>}
 */
async function loadTieredModule(name, caps) {
  const tiers = []
  if (caps.tier === 'full') tiers.push('full', 'simd', 'base')
  else if (caps.tier === 'simd') tiers.push('simd', 'base')
  else tiers.push('base')

  for (const tier of tiers) {
    const suffix = tier === 'full' ? 'full' : tier === 'simd' ? 'simd' : 'base'
    const url = `/wasm/${name}-${suffix}.wasm`
    try {
      const resp = await fetch(url)
      if (!resp.ok) continue // try next tier
      const bytes = await resp.arrayBuffer()
      const imports = {
        env: {
          'Math.sin': Math.sin,
          'Math.cos': Math.cos,
          'Math.sqrt': Math.sqrt,
          'Math.tan': Math.tan,
          'Math.atan2': Math.atan2,
          'Math.abs': Math.abs,
          'Math.floor': Math.floor,
          'Math.ceil': Math.ceil,
          'Math.pow': Math.pow,
          'Math.exp': Math.exp,
          'Math.log': Math.log,
          abort: (msg) => { throw new Error(`WASM abort: ${msg}`) },
        },
      }
      const { instance } = await WebAssembly.instantiate(bytes, imports)
      return { instance, memory: instance.exports.memory, tier }
    } catch (e) {
      continue // try next tier
    }
  }

  return null
}

// ═══════════════════════════════════════════════════════════════
// API wrappers — expose WASM exports as convenient JS methods
// ═══════════════════════════════════════════════════════════════

function createMathAPI(mod, config) {
  const mem = mod.memory
  const wsSize = (config?.workspaceSize || 64) * 1024
  const wsPtr = mod.instance.exports.alloc ? mod.instance.exports.alloc(wsSize) : 0
  const wsView = wsPtr ? new Float32Array(mem.buffer, wsPtr, wsSize / 4) : null

  return {
    memory: mem,
    workspaceView: wsView,
    vec3Add(outPtr, aPtr, bPtr) {
      mod.instance.exports.vec3Add?.(outPtr, aPtr, bPtr)
    },
    vec3Len(outPtr, ptr, count) {
      mod.instance.exports.vec3LengthBatch?.(outPtr, ptr, count)
    },
    vec3Norm(outPtr, ptr, count) {
      mod.instance.exports.vec3NormalizeBatch?.(outPtr, ptr, count)
    },
    vec3TransformMat4Batch(outPtr, inPtr, matPtr, count) {
      mod.instance.exports.vec3TransformMat4Batch?.(outPtr, inPtr, matPtr, count)
    },
    mat4Multiply(outPtr, aPtr, bPtr) {
      mod.instance.exports.mat4Multiply?.(outPtr, aPtr, bPtr)
    },
    describe() {
      return {
        kind: 'uploop.wams-math',
        name: 'WAMSMath',
        tier: mod.tier,
        workspaceSize: wsSize,
      }
    },
  }
}

function createPhysicsAPI(mod, config) {
  const mem = mod.memory
  const maxBodies = config?.maxBodies || 5000
  const maxContacts = config?.maxContacts || 2000
  const BODY_SIZE = 44
  const CONTACT_SIZE = 64

  const bodiesPtr = mod.instance.exports.alloc
    ? mod.instance.exports.alloc(maxBodies * BODY_SIZE)
    : 0
  const contactsPtr = mod.instance.exports.alloc
    ? mod.instance.exports.alloc(maxContacts * CONTACT_SIZE)
    : 0

  return {
    memory: mem,
    maxBodies,
    maxContacts,
    bodiesPtr,
    contactsPtr,
    get bodiesView() {
      return new Float32Array(mem.buffer, bodiesPtr, maxBodies * 11)
    },
    get contactsView() {
      return new Float32Array(mem.buffer, contactsPtr, maxContacts * 16)
    },
    step(dt, iterations = 4) {
      mod.instance.exports.physicsStep?.(bodiesPtr, maxBodies, contactsPtr, maxContacts, dt, iterations)
    },
    describe() {
      return {
        kind: 'uploop.wams-physics',
        name: 'WAMSPhysics',
        tier: mod.tier,
        maxBodies,
        maxContacts,
      }
    },
  }
}

function createBVHAPI(mod, config) {
  const mem = mod.memory
  const maxTriangles = config?.maxTriangles || 50000
  const NODE_SIZE = 32 // AABB min(12) + max(12) + left(4) + right(4) = 32 bytes
  const maxNodes = maxTriangles * 2

  const nodesPtr = mod.instance.exports.alloc
    ? mod.instance.exports.alloc(maxNodes * NODE_SIZE)
    : 0

  return {
    memory: mem,
    maxTriangles,
    maxNodes,
    nodesPtr,
    build(triPtr, triCount) {
      mod.instance.exports.bvhBuild?.(triPtr, triCount, nodesPtr)
    },
    traverse(rayPtr, rayCount, resultPtr) {
      return mod.instance.exports.bvhTraverse?.(nodesPtr, rayPtr, rayCount, resultPtr) || 0
    },
    describe() {
      return {
        kind: 'uploop.wams-bvh',
        name: 'WAMSBVH',
        tier: mod.tier,
        maxTriangles,
        maxNodes,
      }
    },
  }
}

function createGeometryAPI(mod) {
  const mem = mod.memory
  return {
    memory: mem,
    skin(vertexPtr, jointMatricesPtr, weightsPtr, jointsPtr, vertexCount) {
      mod.instance.exports.skinBatch?.(vertexPtr, jointMatricesPtr, weightsPtr, jointsPtr, vertexCount)
    },
    morph(basePtr, targetsPtr, weightsPtr, targetCount, vertexCount) {
      mod.instance.exports.morphBatch?.(basePtr, targetsPtr, weightsPtr, targetCount, vertexCount)
    },
    describe() {
      return { kind: 'uploop.wams-geometry', name: 'WAMSGeometry', tier: mod.tier }
    },
  }
}

function createRaytracerAPI(mod) {
  const mem = mod.memory
  return {
    memory: mem,
    renderFrame(cameraPtr, width, height, samples) {
      mod.instance.exports.pathTraceFrame?.(cameraPtr, width, height, samples)
    },
    describe() {
      return { kind: 'uploop.wams-raytracer', name: 'WAMSRaytracer', tier: mod.tier }
    },
  }
}

export default { createEngine }
