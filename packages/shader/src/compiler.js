/**
 * Shader Compiler — GLSL source → compiled WebGL program.
 *
 * Provides GLSL source parsing, compilation, linking, and auto-detection
 * of uniforms and attributes from the compiled program. WGSL (WebGPU)
 * scaffold for future implementation.
 */

/**
 * Compile a GLSL shader from source.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number} type — gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source — GLSL source code
 * @returns {WebGLShader}
 */
export function compileSource(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader compile error:\n${log}`)
  }

  return shader
}

/**
 * Create a shader program from vertex + fragment sources.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string} vertexSource
 * @param {string} fragmentSource
 * @returns {{ program: WebGLProgram, uniforms: Object, attributes: Object }}
 */
export function createProgram(gl, vertexSource, fragmentSource) {
  const vs = compileSource(gl, gl.VERTEX_SHADER, vertexSource)
  const fs = compileSource(gl, gl.FRAGMENT_SHADER, fragmentSource)

  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    gl.deleteProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    throw new Error(`Shader link error:\n${log}`)
  }

  // Shaders can be deleted after linking
  gl.deleteShader(vs)
  gl.deleteShader(fs)

  // Introspect uniforms and attributes
  const uniforms = getUniforms(gl, program)
  const attributes = getAttributes(gl, program)

  return { program, uniforms, attributes }
}

/**
 * Get uniform info from a compiled program.
 * @returns {Object<string, UniformInfo>}
 */
export function getUniforms(gl, program) {
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
  const uniforms = {}

  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)
    if (!info) continue
    const loc = gl.getUniformLocation(program, info.name)
    uniforms[info.name] = {
      name: info.name,
      type: glTypeName(info.type),
      size: info.size,
      location: loc,
      // Strip array suffix for base name
      baseName: info.name.replace(/\[0\]$/, ''),
    }
  }

  return uniforms
}

/**
 * Get attribute info from a compiled program.
 * @returns {Object<string, AttributeInfo>}
 */
export function getAttributes(gl, program) {
  const count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
  const attrs = {}

  for (let i = 0; i < count; i++) {
    const info = gl.getActiveAttrib(program, i)
    if (!info) continue
    const loc = gl.getAttribLocation(program, info.name)
    attrs[info.name] = {
      name: info.name,
      type: glTypeName(info.type),
      size: info.size,
      location: loc,
    }
  }

  return attrs
}

// GL type → human-readable name
function glTypeName(type) {
  const gl = WebGL2RenderingContext
  switch (type) {
    case gl.FLOAT: return 'float'
    case gl.FLOAT_VEC2: return 'vec2'
    case gl.FLOAT_VEC3: return 'vec3'
    case gl.FLOAT_VEC4: return 'vec4'
    case gl.INT: return 'int'
    case gl.INT_VEC2: return 'ivec2'
    case gl.INT_VEC3: return 'ivec3'
    case gl.INT_VEC4: return 'ivec4'
    case gl.BOOL: return 'bool'
    case gl.FLOAT_MAT2: return 'mat2'
    case gl.FLOAT_MAT3: return 'mat3'
    case gl.FLOAT_MAT4: return 'mat4'
    case gl.SAMPLER_2D: return 'sampler2D'
    case gl.SAMPLER_CUBE: return 'samplerCube'
    case gl.SAMPLER_3D: return 'sampler3D'
    default: return `unknown(${type})`
  }
}

/**
 * Parse GLSL source to find #ifdef blocks, uniform declarations, etc.
 * (Used for shader variants/preprocessing without compiling)
 */
export function parseGLSL(source) {
  const uniforms = []
  const defines = []
  const lines = source.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // #define
    if (trimmed.startsWith('#define')) {
      const parts = trimmed.slice(8).trim().split(/\s+/)
      defines.push({ name: parts[0], value: parts.slice(1).join(' ') || '1' })
    }

    // uniform declarations
    const uniformMatch = trimmed.match(/^uniform\s+(\w+)\s+(\w+)\s*;/)
    if (uniformMatch) {
      uniforms.push({ type: uniformMatch[1], name: uniformMatch[2] })
    }
  }

  return { uniforms, defines }
}

/**
 * Inject #define macros at the top of a shader source.
 * @param {string} source
 * @param {Object<string, (string|number|boolean)>} defines
 * @returns {string}
 */
export function injectDefines(source, defines = {}) {
  const lines = []
  for (const [key, value] of Object.entries(defines)) {
    lines.push(`#define ${key} ${value}`)
  }
  // Insert after #version if present
  const versionMatch = source.match(/^#version\s+\d+.*$/m)
  if (versionMatch) {
    const idx = source.indexOf(versionMatch[0]) + versionMatch[0].length
    return source.slice(0, idx) + '\n' + lines.join('\n') + source.slice(idx)
  }
  return lines.join('\n') + '\n' + source
}

export default { compileSource, createProgram, getUniforms, getAttributes,
  parseGLSL, injectDefines }
