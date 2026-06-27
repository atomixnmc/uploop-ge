/**
 * Material — Shader + Uniform values + Render state.
 *
 * A material combines a compiled shader program with uniform values and
 * WebGL state (depth test, blending, culling). Materials are reusable
 * across multiple meshes.
 */

/**
 * Create a material.
 *
 * @param {Object} opts
 * @param {CompiledShader|Object} opts.shader — { program, uniforms, attributes }
 * @param {Object<string, *>} [opts.uniforms={}] — initial uniform values
 * @param {Object} [opts.state] — WebGL render state overrides
 * @param {boolean} [opts.state.depthTest=true]
 * @param {boolean} [opts.state.depthWrite=true]
 * @param {number} [opts.state.depthFunc] — gl.LEQUAL
 * @param {boolean} [opts.state.blend=false]
 * @param {number} [opts.state.blendSrc] — gl.SRC_ALPHA
 * @param {number} [opts.state.blendDst] — gl.ONE_MINUS_SRC_ALPHA
 * @param {number} [opts.state.cullFace] — gl.BACK
 * @param {boolean} [opts.state.wireframe=false]
 * @returns {Material}
 */
export function createMaterial({ shader, uniforms = {}, state = {} }) {
  // GL constants — fallback values for non-browser environments
  const GL = typeof WebGL2RenderingContext !== 'undefined'
    ? WebGL2RenderingContext
    : { LEQUAL: 0x0203, SRC_ALPHA: 0x0302, ONE_MINUS_SRC_ALPHA: 0x0303,
        ONE: 1, BACK: 0x0405 }

  const defaultState = {
    depthTest: true,
    depthWrite: true,
    depthFunc: GL.LEQUAL,
    blend: false,
    blendSrc: GL.SRC_ALPHA,
    blendDst: GL.ONE_MINUS_SRC_ALPHA,
    blendSrcAlpha: GL.ONE,
    blendDstAlpha: GL.ONE_MINUS_SRC_ALPHA,
    cullFace: GL.BACK,
    wireframe: false,
  }

  const material = {
    shader,
    uniforms: { ...uniforms },
    state: { ...defaultState, ...state },

    /**
     * Set a uniform value.
     * @param {string} name
     * @param {*} value
     */
    setUniform(name, value) {
      this.uniforms[name] = value
      return this
    },

    /**
     * Set multiple uniforms at once.
     * @param {Object<string, *>} values
     */
    setUniforms(values) {
      Object.assign(this.uniforms, values)
      return this
    },

    /**
     * Apply material state to the current GL context.
     * Call this before drawing.
     * @param {WebGL2RenderingContext} gl
     */
    apply(gl) {
      const s = this.state

      if (s.depthTest) gl.enable(gl.DEPTH_TEST)
      else gl.disable(gl.DEPTH_TEST)

      gl.depthMask(s.depthWrite)
      gl.depthFunc(s.depthFunc)

      if (s.blend) {
        gl.enable(gl.BLEND)
        gl.blendFuncSeparate(s.blendSrc, s.blendDst, s.blendSrcAlpha, s.blendDstAlpha)
      } else {
        gl.disable(gl.BLEND)
      }

      if (s.cullFace !== false) {
        gl.enable(gl.CULL_FACE)
        gl.cullFace(s.cullFace)
      } else {
        gl.disable(gl.CULL_FACE)
      }
    },

    /**
     * Upload all uniforms to the shader program.
     * @param {WebGL2RenderingContext} gl
     */
    uploadUniforms(gl) {
      const program = this.shader.program
      gl.useProgram(program)

      for (const [name, info] of Object.entries(this.shader.uniforms)) {
        const value = this.uniforms[name]
        if (value === undefined) continue

        const loc = info.location
        if (loc === null) continue

        switch (info.type) {
          case 'float': gl.uniform1f(loc, value); break
          case 'vec2': gl.uniform2fv(loc, value); break
          case 'vec3': gl.uniform3fv(loc, value); break
          case 'vec4': gl.uniform4fv(loc, value); break
          case 'int': case 'bool': gl.uniform1i(loc, value); break
          case 'ivec2': gl.uniform2iv(loc, value); break
          case 'ivec3': gl.uniform3iv(loc, value); break
          case 'ivec4': gl.uniform4iv(loc, value); break
          case 'mat3': gl.uniformMatrix3fv(loc, false, value); break
          case 'mat4': gl.uniformMatrix4fv(loc, false, value); break
          case 'sampler2D': case 'samplerCube':
            gl.uniform1i(loc, value); break
        }
      }
    },

    /**
     * Clone the material (shares shader, copies uniforms).
     */
    clone() {
      return createMaterial({
        shader: this.shader,
        uniforms: { ...this.uniforms },
        state: { ...this.state },
      })
    },
  }

  return material
}

export default { createMaterial }
