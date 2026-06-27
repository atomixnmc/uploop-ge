/**
 * Render Pipeline — Combines shader, vertex format, and state into
 * a reusable rendering configuration.
 *
 * The pipeline manages VAO creation, vertex attribute pointer setup,
 * and shader program binding. It's the primary draw-call interface.
 *
 * @depends @uploop/shader (Material, AttributeLayout)
 * @depends @uploop/geometry (VertexFormat)
 */

import { createAttributeLayout, applyAttributeLayout } from '@uploop/shader'
import { VertexFormat } from '@uploop/geometry'

/**
 * Create a render pipeline.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {PipelineConfig} config
 * @returns {RenderPipeline}
 */
export function createPipeline(gl, {
  shader,
  vertexFormat,
  indexBuffer = null,
  state = {},
}) {
  // Create VAO
  const vao = gl.createVertexArray()

  // Create attribute layout from shader's attributes + vertex format
  // (The actual binding happens in bind(), before each draw call)
  const attrLayout = createAttributeLayout(vertexFormat, shader.attributes)

  // Default state
  const pipelineState = {
    depthTest: state.depthTest ?? true,
    depthWrite: state.depthWrite ?? true,
    depthFunc: state.depthFunc ?? gl.LEQUAL,
    cullFace: state.cullFace ?? gl.BACK,
    blend: state.blend ?? false,
    blendSrc: state.blendSrc ?? gl.SRC_ALPHA,
    blendDst: state.blendDst ?? gl.ONE_MINUS_SRC_ALPHA,
    topology: state.topology ?? gl.TRIANGLES,
  }

  const pipeline = {
    gl,
    shader,
    vao,
    vertexFormat,
    attrLayout,
    indexBuffer,
    state: pipelineState,

    /**
     * Bind the pipeline for drawing. Sets up VAO, shader program,
     * and applies GL state.
     */
    bind() {
      gl.useProgram(shader.program)
      gl.bindVertexArray(vao)

      // State
      if (pipelineState.depthTest) gl.enable(gl.DEPTH_TEST)
      else gl.disable(gl.DEPTH_TEST)
      gl.depthMask(pipelineState.depthWrite)
      gl.depthFunc(pipelineState.depthFunc)

      if (pipelineState.cullFace !== false) {
        gl.enable(gl.CULL_FACE)
        gl.cullFace(pipelineState.cullFace)
      } else {
        gl.disable(gl.CULL_FACE)
      }

      if (pipelineState.blend) {
        gl.enable(gl.BLEND)
        gl.blendFunc(pipelineState.blendSrc, pipelineState.blendDst)
      } else {
        gl.disable(gl.BLEND)
      }
    },

    /**
     * Set vertex buffer and configure attribute pointers.
     * Must be called after bind() and before draw.
     *
     * @param {WebGLBuffer} vertexBuffer
     */
    setVertexBuffer(vertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      applyAttributeLayout(gl, this.attrLayout)
    },

    /**
     * Set index buffer for indexed drawing.
     * @param {WebGLBuffer} buffer
     */
    setIndexBuffer(buffer) {
      this.indexBuffer = buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
    },

    /**
     * Upload a uniform value directly.
     * @param {string} name
     * @param {*} value
     */
    setUniform(name, value) {
      const info = this.shader.uniforms[name]
      if (!info || info.location === null) return
      _uploadUniform(gl, info.location, info.type, value)
    },

    /** Unbind the pipeline */
    unbind() {
      gl.bindVertexArray(null)
      gl.useProgram(null)
    },

    /** Dispose GPU resources */
    dispose() {
      gl.deleteVertexArray(vao)
    },
  }

  return pipeline
}

// --- Helpers ---

function _uploadUniform(gl, loc, type, value) {
  switch (type) {
    case 'float': gl.uniform1f(loc, value); break
    case 'vec2': gl.uniform2fv(loc, value); break
    case 'vec3': gl.uniform3fv(loc, value); break
    case 'vec4': gl.uniform4fv(loc, value); break
    case 'int': case 'bool': case 'sampler2D': case 'samplerCube':
      gl.uniform1i(loc, value); break
    case 'ivec2': gl.uniform2iv(loc, value); break
    case 'ivec3': gl.uniform3iv(loc, value); break
    case 'ivec4': gl.uniform4iv(loc, value); break
    case 'mat3': gl.uniformMatrix3fv(loc, false, value); break
    case 'mat4': gl.uniformMatrix4fv(loc, false, value); break
  }
}

export default { createPipeline }
