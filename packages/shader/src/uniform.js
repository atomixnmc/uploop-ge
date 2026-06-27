/**
 * Uniform Block — Typed uniform descriptor for creating and uploading
 * structured uniform data (e.g., camera matrices, light params).
 *
 * A UniformBlock defines a set of named uniforms with types, defaults,
 * and upload logic. Useful for shared uniforms across materials.
 */

/**
 * Create a uniform block descriptor.
 *
 * @param {Object<string, {type: string, default?: *, size?: number}>} schema
 * @returns {UniformBlock}
 *
 * @example
 *   const cameraBlock = createUniformBlock({
 *     uViewMatrix: { type: 'mat4' },
 *     uProjectionMatrix: { type: 'mat4' },
 *     uCameraPosition: { type: 'vec3' },
 *   })
 *   cameraBlock.set('uViewMatrix', viewMatrix)
 */
export function createUniformBlock(schema) {
  const values = {}
  const dirty = {}

  // Initialize defaults
  for (const [name, def] of Object.entries(schema)) {
    values[name] = def.default ?? null
    dirty[name] = true
  }

  const block = {
    schema,
    values,

    /**
     * Set a uniform value. Marks it dirty for upload.
     */
    set(name, value) {
      values[name] = value
      dirty[name] = true
      return this
    },

    /**
     * Set multiple values at once.
     */
    setAll(obj) {
      for (const [k, v] of Object.entries(obj)) {
        if (k in schema) {
          values[k] = v
          dirty[k] = true
        }
      }
      return this
    },

    /**
     * Upload all dirty uniforms to a shader program.
     * @param {WebGL2RenderingContext} gl
     * @param {Object<string, UniformInfo>} shaderUniforms — from compiled shader
     */
    upload(gl, shaderUniforms) {
      for (const [name, info] of Object.entries(shaderUniforms)) {
        if (!(name in values) || !dirty[name]) continue
        const value = values[name]
        if (value === null || value === undefined) continue

        const loc = info.location
        if (loc === null) continue

        switch (info.type) {
          case 'float': gl.uniform1f(loc, value); break
          case 'vec2': gl.uniform2fv(loc, value); break
          case 'vec3': gl.uniform3fv(loc, value); break
          case 'vec4': gl.uniform4fv(loc, value); break
          case 'int': case 'bool': gl.uniform1i(loc, value); break
          case 'mat3': gl.uniformMatrix3fv(loc, false, value); break
          case 'mat4': gl.uniformMatrix4fv(loc, false, value); break
          case 'sampler2D': case 'samplerCube': gl.uniform1i(loc, value); break
        }
        dirty[name] = false
      }
    },

    /**
     * Mark all uniforms dirty (force full re-upload).
     */
    markAllDirty() {
      for (const name of Object.keys(schema)) {
        dirty[name] = true
      }
    },

    /**
     * Get current value.
     */
    get(name) {
      return values[name]
    },
  }

  return block
}

export default { createUniformBlock }
