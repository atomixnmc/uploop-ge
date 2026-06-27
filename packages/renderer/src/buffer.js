/**
 * GPU Buffer — Typed buffer creation and upload for vertex, index,
 * uniform, and storage buffers.
 */

/**
 * Create an Array Buffer (vertex data).
 *
 * @param {WebGL2RenderingContext} gl
 * @param {Float32Array|ArrayBuffer} data — vertex data
 * @param {'static'|'dynamic'|'stream'} [usage='static']
 * @returns {WebGLBuffer}
 */
export function createVertexBuffer(gl, data, usage = 'static') {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, glUsage(gl, usage))
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  return buffer
}

/**
 * Create an Element Array Buffer (index data).
 *
 * @param {WebGL2RenderingContext} gl
 * @param {Uint16Array|Uint32Array} data — index data
 * @param {'static'|'dynamic'|'stream'} [usage='static']
 * @returns {WebGLBuffer}
 */
export function createIndexBuffer(gl, data, usage = 'static') {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, glUsage(gl, usage))
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
  return buffer
}

/**
 * Create a Uniform Buffer Object (UBO).
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number} size — bytes
 * @param {'static'|'dynamic'|'stream'} [usage='dynamic']
 * @returns {WebGLBuffer}
 */
export function createUniformBuffer(gl, size, usage = 'dynamic') {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.UNIFORM_BUFFER, buffer)
  gl.bufferData(gl.UNIFORM_BUFFER, size, glUsage(gl, usage))
  gl.bindBuffer(gl.UNIFORM_BUFFER, null)
  return buffer
}

/**
 * Update buffer data (sub-data or full replace).
 *
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLBuffer} buffer
 * @param {'array'|'element'|'uniform'} target
 * @param {ArrayBuffer} data
 * @param {number} [offset=0]
 */
export function updateBuffer(gl, buffer, target, data, offset = 0) {
  const t = target === 'element'
    ? gl.ELEMENT_ARRAY_BUFFER
    : target === 'uniform'
      ? gl.UNIFORM_BUFFER
      : gl.ARRAY_BUFFER
  gl.bindBuffer(t, buffer)
  gl.bufferSubData(t, offset, data)
  gl.bindBuffer(t, null)
}

/**
 * Delete a GPU buffer.
 */
export function deleteBuffer(gl, buffer) {
  gl.deleteBuffer(buffer)
}

function glUsage(gl, usage) {
  switch (usage) {
    case 'dynamic': return gl.DYNAMIC_DRAW
    case 'stream': return gl.STREAM_DRAW
    default: return gl.STATIC_DRAW
  }
}

export default { createVertexBuffer, createIndexBuffer, createUniformBuffer,
  updateBuffer, deleteBuffer }
