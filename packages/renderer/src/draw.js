/**
 * Draw Commands — Issue draw calls to the GPU.
 *
 * Provides draw, drawIndexed, and drawInstanced wrappers around
 * the raw WebGL draw functions with automatic topology handling.
 */

/**
 * Draw non-indexed geometry.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {DrawConfig} config
 */
export function draw(gl, {
  mode = gl.TRIANGLES,
  first = 0,
  count,
  instanceCount = 0,
}) {
  if (instanceCount > 0) {
    gl.drawArraysInstanced(mode, first, count, instanceCount)
  } else {
    gl.drawArrays(mode, first, count)
  }
}

/**
 * Draw indexed geometry.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {DrawIndexedConfig} config
 */
export function drawIndexed(gl, {
  mode = gl.TRIANGLES,
  count,
  indexType = gl.UNSIGNED_SHORT,
  offset = 0,
  instanceCount = 0,
}) {
  if (instanceCount > 0) {
    gl.drawElementsInstanced(mode, count, indexType, offset, instanceCount)
  } else {
    gl.drawElements(mode, count, indexType, offset)
  }
}

/**
 * Draw with instancing (convenience wrapper).
 */
export function drawInstanced(gl, {
  mode = gl.TRIANGLES,
  first = 0,
  count,
  instanceCount,
}) {
  gl.drawArraysInstanced(mode, first, count, instanceCount)
}

/**
 * Clear the current framebuffer.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {number} [mask] — gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT
 * @param {number[]} [color=[0,0,0,1]]
 * @param {number} [depth=1]
 * @param {number} [stencil=0]
 */
export function clear(gl, mask, color, depth = 1, stencil = 0) {
  const m = mask ?? (gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  if (color) {
    gl.clearColor(color[0], color[1], color[2], color[3] ?? 1)
  }
  if (mask === undefined || mask & gl.DEPTH_BUFFER_BIT) {
    gl.clearDepth(depth)
  }
  if (mask && mask & gl.STENCIL_BUFFER_BIT) {
    gl.clearStencil(stencil)
  }
  gl.clear(m)
}

/**
 * Set the viewport.
 */
export function viewport(gl, x, y, width, height) {
  gl.viewport(x, y, width, height)
}

/**
 * Set scissor rect (for scissor testing).
 */
export function scissor(gl, x, y, width, height) {
  gl.enable(gl.SCISSOR_TEST)
  gl.scissor(x, y, width, height)
}

/** Read pixels from current framebuffer */
export function readPixels(gl, x, y, width, height, format, type) {
  const fmt = format ?? gl.RGBA
  const tp = type ?? gl.UNSIGNED_BYTE
  const size = width * height * 4
  const data = new Uint8Array(size)
  gl.readPixels(x, y, width, height, fmt, tp, data)
  return data
}

export default { draw, drawIndexed, drawInstanced, clear, viewport, scissor, readPixels }
