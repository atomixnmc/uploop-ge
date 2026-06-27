/**
 * Renderer Context — Canvas → WebGL 2.0 / WebGPU context.
 *
 * Auto-selects the best available backend, creates and manages the GPU
 * context, and provides capabilities info.
 */

/**
 * Create a render context from a canvas element.
 *
 * @param {ContextConfig} config
 * @returns {RenderContext}
 */
export function createContext({
  canvas,
  prefer,
  antialias = true,
  alphaMode = 'opaque',
  powerPreference = 'high-performance',
}) {
  // Try WebGPU first if preferred or auto-detect
  if ((prefer === 'webgpu' || !prefer) && typeof navigator !== 'undefined' && navigator.gpu) {
    try {
      return createWebGPUContext(canvas, { antialias, alphaMode, powerPreference })
    } catch (e) {
      if (prefer === 'webgpu') throw e
      // Fall through to WebGL
    }
  }

  // WebGL 2.0
  return createWebGL2Context(canvas, { antialias, alphaMode, powerPreference })
}

function createWebGL2Context(canvas, { antialias, alphaMode, powerPreference }) {
  const attrs = {
    alpha: alphaMode === 'premultiplied',
    premultipliedAlpha: alphaMode === 'premultiplied',
    antialias,
    powerPreference,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
  }

  const gl = canvas.getContext('webgl2', attrs)
  if (!gl) {
    // Fallback to webgl (WebGL 1)
    const gl1 = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs)
    if (!gl1) throw new Error('WebGL not supported')
    return wrapContext(gl1, canvas, 'webgl')
  }
  return wrapContext(gl, canvas, 'webgl2')
}

function createWebGPUContext(canvas, { antialias, alphaMode }) {
  // WebGPU context creation is async but we need sync.
  // In practice, users should call getContext('webgpu') and configure.
  // This is a placeholder for future async initialization.
  throw new Error('WebGPU context creation requires async initialization. Use getCapabilities() to check support first.')
}

function wrapContext(gl, canvas, backend) {
  // Default WebGL 2.0 state
  gl.enable(gl.DEPTH_TEST)
  gl.depthFunc(gl.LEQUAL)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  gl.clearColor(0, 0, 0, 1)

  const ctx = {
    backend,
    gl,
    canvas,
    width: canvas.width,
    height: canvas.height,

    /** Resize the drawing buffer to match canvas CSS size */
    resize() {
      const dpr = window.devicePixelRatio || 1
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        this.width = w
        this.height = h
      }
    },

    /** Set viewport to full canvas */
    viewport() {
      gl.viewport(0, 0, canvas.width, canvas.height)
    },

    /** Clear the framebuffer */
    clear(mask = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT) {
      gl.clear(mask)
    },

    /** Present rendered frame (WebGL does this automatically, but explicit for API symmetry) */
    present() {
      // No-op for WebGL. WebGPU would call device.queue.submit here.
    },

    /** Get GPU capabilities */
    getCapabilities() {
      return getCaps(gl, backend)
    },

    /** Dispose / lose context */
    dispose() {
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    },
  }

  return ctx
}

function getCaps(gl, backend) {
  return {
    backend,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxDrawBuffers: gl.getParameter(gl.MAX_DRAW_BUFFERS),
    maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    // Extensions
    anisotropy: gl.getExtension('EXT_texture_filter_anisotropic')
      ? gl.getParameter(gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT)
      : 0,
    floatTextures: !!gl.getExtension('OES_texture_float'),
    floatLinearTextures: !!gl.getExtension('OES_texture_float_linear'),
    halfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
    depthTexture: true, // WebGL 2.0 has this natively
    instancedArrays: true, // WebGL 2.0 has this natively
    vertexArrayObjects: true, // WebGL 2.0 has this natively
    // GLSL version
    glslVersion: backend === 'webgl2' ? '300 es' : '100',
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
  }
}

/**
 * Synchronously check which backends are available.
 * Does not create a context.
 */
export function getCapabilities() {
  const caps = { webgl2: false, webgl: false, webgpu: false }

  // Check WebGPU
  if (typeof navigator !== 'undefined' && navigator.gpu) {
    caps.webgpu = true
  }

  // Check WebGL (need a temp canvas)
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const gl2 = canvas.getContext('webgl2')
    if (gl2) {
      caps.webgl2 = true
    } else {
      const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      caps.webgl = !!gl1
    }
  }

  return caps
}

export default { createContext, getCapabilities }
