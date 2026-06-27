/**
 * Stage — A single render pass in the pipeline.
 *
 * Each stage is a HyperGraph node with input attachments (edges in) and
 * output attachments (edges out). Stages can have custom onBind hooks.
 *
 * @depends types.js, attachment.js
 */
import { initAttachment } from './attachment.js'

/**
 * Create a pipeline stage.
 * @param {Object} opts
 * @param {string} opts.name
 * @param {string} opts.vertexShader — GLSL vertex source
 * @param {string} opts.fragmentShader — GLSL fragment source
 * @param {import('./types.js').Attachment[]} [opts.inputs=[]]
 * @param {import('./types.js').Attachment[]} [opts.outputs=[]]
 * @param {Object} [opts.uniforms={}] — default uniform values
 * @param {Function} [opts.onBind] — (gl, stage, pipeline) => void
 * @param {boolean} [opts.clearColor=true]
 * @param {boolean} [opts.clearDepth=true]
 * @param {number[]} [opts.viewport] — [x, y, w, h] or null for full
 * @returns {import('./types.js').Stage}
 */
export function createStage({
  name,
  vertexShader,
  fragmentShader,
  inputs = [],
  outputs = [],
  uniforms = {},
  onBind = null,
  clearColor = true,
  clearDepth = true,
  viewport = null,
} = {}) {
  return {
    name,
    program: null,
    vertexShader,
    fragmentShader,
    inputs,
    outputs,
    enabled: true,
    uniforms,
    onBind,
    clearColor,
    clearDepth,
    viewport,
  }
}

/**
 * Compile stage shaders and initialize GPU resources.
 * @param {WebGL2RenderingContext} gl
 * @param {import('./types.js').Stage} stage
 * @param {number} width
 * @param {number} height
 */
export function initStage(gl, stage, width, height) {
  // Compile shader program
  const vs = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vs, stage.vertexShader)
  gl.compileShader(vs)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(vs)
    gl.deleteShader(vs)
    throw new Error(`Stage "${stage.name}" vertex shader: ${info}`)
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fs, stage.fragmentShader)
  gl.compileShader(fs)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(fs)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    throw new Error(`Stage "${stage.name}" fragment shader: ${info}`)
  }

  stage.program = gl.createProgram()
  gl.attachShader(stage.program, vs)
  gl.attachShader(stage.program, fs)
  gl.linkProgram(stage.program)
  if (!gl.getProgramParameter(stage.program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(stage.program)
    throw new Error(`Stage "${stage.name}" link: ${info}`)
  }

  gl.deleteShader(vs)
  gl.deleteShader(fs)

  // Initialize output attachments
  for (const out of stage.outputs) {
    initAttachment(gl, out, width, height)
  }
}

/**
 * Execute a stage: bind inputs, render to outputs.
 * @param {WebGL2RenderingContext} gl
 * @param {import('./types.js').Stage} stage
 * @param {import('./types.js').Pipeline} pipeline
 * @param {Object} [extraUniforms]
 */
export function executeStage(gl, stage, pipeline, extraUniforms = {}) {
  if (!stage.enabled || !stage.program) return

  gl.useProgram(stage.program)

  // Bind output framebuffer
  if (stage.outputs.length > 0) {
    const out = stage.outputs[0]
    gl.bindFramebuffer(gl.FRAMEBUFFER, out.framebuffer)
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  // Set viewport
  if (stage.viewport) {
    gl.viewport(...stage.viewport)
  } else {
    gl.viewport(0, 0, pipeline.width, pipeline.height)
  }

  // Clear
  let clearBits = 0
  if (stage.clearColor) clearBits |= gl.COLOR_BUFFER_BIT
  if (stage.clearDepth) clearBits |= gl.DEPTH_BUFFER_BIT
  if (clearBits) gl.clear(clearBits)

  // Bind input textures
  let texUnit = 0
  for (const input of stage.inputs) {
    if (input.texture) {
      gl.activeTexture(gl.TEXTURE0 + texUnit)
      gl.bindTexture(gl.TEXTURE_2D, input.texture)
      const loc = gl.getUniformLocation(stage.program, `u_${input.name}`)
      if (loc) gl.uniform1i(loc, texUnit)
      texUnit++
    }
  }

  // Custom bind hook
  if (stage.onBind) {
    stage.onBind(gl, stage, pipeline)
  }

  // Apply extra uniforms
  for (const [key, value] of Object.entries(extraUniforms)) {
    const loc = gl.getUniformLocation(stage.program, key)
    if (!loc) continue
    if (typeof value === 'number') gl.uniform1f(loc, value)
    else if (value.length === 2) gl.uniform2fv(loc, value)
    else if (value.length === 3) gl.uniform3fv(loc, value)
    else if (value.length === 4) gl.uniform4fv(loc, value)
    else if (value.length === 9) gl.uniformMatrix3fv(loc, false, value)
    else if (value.length === 16) gl.uniformMatrix4fv(loc, false, value)
  }
}

/**
 * Dispose stage GPU resources.
 * @param {WebGL2RenderingContext} gl
 * @param {import('./types.js').Stage} stage
 */
export function disposeStage(gl, stage) {
  if (stage.program) {
    gl.deleteProgram(stage.program)
    stage.program = null
  }
}

export default { createStage, initStage, executeStage, disposeStage }
