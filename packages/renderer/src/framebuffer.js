/**
 * Framebuffer — Render-to-texture targets, MRT, and depth/stencil attachments.
 */

/**
 * Create a framebuffer with optional color + depth attachments.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {FramebufferConfig} config
 * @returns {{ framebuffer: WebGLFramebuffer, colorTextures: WebGLTexture[], depthTexture: WebGLTexture|null, width: number, height: number }}
 */
export function createFramebuffer(gl, {
  width,
  height,
  colorAttachments = 1,
  colorFormat = 'rgba8',
  depthAttachment = true,
  depthFormat = 'depth',
  samples = 0, // 0 = no MSAA
}) {
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

  const colorTextures = []
  const drawBuffers = []

  const { internal, srcFormat, srcType } = _resolveFormat(gl, colorFormat)

  for (let i = 0; i < colorAttachments; i++) {
    const tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, srcFormat, srcType, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0)
    colorTextures.push(tex)
    drawBuffers.push(gl.COLOR_ATTACHMENT0 + i)
  }

  gl.drawBuffers(drawBuffers)

  let depthTexture = null
  if (depthAttachment) {
    const { internal: dInternal, srcFormat: dSrcFormat, srcType: dSrcType } = _resolveFormat(gl, depthFormat)
    depthTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, depthTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, dInternal, width, height, 0, dSrcFormat, dSrcType, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0)
  }

  // Check completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.warn('Framebuffer incomplete:', status)
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return {
    framebuffer: fbo,
    colorTextures,
    depthTexture,
    width,
    height,
  }
}

/**
 * Bind a framebuffer for rendering.
 * Pass null to bind the default (screen) framebuffer.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {Object|null} fb — framebuffer object or null
 */
export function bindFramebuffer(gl, fb) {
  if (fb) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer)
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
}

/**
 * Blit (copy) from one framebuffer to another.
 * Useful for post-processing chains.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {Object} src — source framebuffer
 * @param {Object} dst — destination framebuffer (null = screen)
 */
export function blitFramebuffer(gl, src, dst = null, mask = gl.COLOR_BUFFER_BIT) {
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.framebuffer)
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, dst ? dst.framebuffer : null)
  gl.blitFramebuffer(
    0, 0, src.width, src.height,
    0, 0, dst ? dst.width : gl.canvas.width, dst ? dst.height : gl.canvas.height,
    mask, gl.NEAREST
  )
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
}

/**
 * Resize a framebuffer (recreates attachments).
 */
export function resizeFramebuffer(gl, fb, width, height) {
  const newFb = createFramebuffer(gl, {
    width,
    height,
    colorAttachments: fb.colorTextures.length,
    depthAttachment: !!fb.depthTexture,
  })
  // Dispose old
  deleteFramebuffer(gl, fb)
  return newFb
}

/** Delete a framebuffer and its attachments */
export function deleteFramebuffer(gl, fb) {
  gl.deleteFramebuffer(fb.framebuffer)
  for (const tex of fb.colorTextures) gl.deleteTexture(tex)
  if (fb.depthTexture) gl.deleteTexture(fb.depthTexture)
}

function _resolveFormat(gl, format) {
  let internal, srcFormat, srcType
  switch (format) {
    case 'rgba8':
      internal = gl.RGBA8; srcFormat = gl.RGBA; srcType = gl.UNSIGNED_BYTE; break
    case 'rgba16f':
      internal = gl.RGBA16F; srcFormat = gl.RGBA; srcType = gl.HALF_FLOAT; break
    case 'rgba32f':
      internal = gl.RGBA32F; srcFormat = gl.RGBA; srcType = gl.FLOAT; break
    case 'depth':
      internal = gl.DEPTH_COMPONENT24; srcFormat = gl.DEPTH_COMPONENT; srcType = gl.UNSIGNED_INT; break
    case 'depth24_stencil8':
      internal = gl.DEPTH24_STENCIL8; srcFormat = gl.DEPTH_STENCIL; srcType = gl.UNSIGNED_INT_24_8; break
    default:
      internal = gl.RGBA8; srcFormat = gl.RGBA; srcType = gl.UNSIGNED_BYTE
  }
  return { internal, srcFormat, srcType }
}

export default { createFramebuffer, bindFramebuffer, blitFramebuffer,
  resizeFramebuffer, deleteFramebuffer }
