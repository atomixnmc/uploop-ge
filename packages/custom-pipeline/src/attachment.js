/**
 * Attachment — Framebuffer color/depth attachment managed by the pipeline.
 *
 * Attachments are texture nodes in the render graph. They flow between
 * stages as inputs and outputs.
 *
 * @depends types.js
 */

/**
 * Create a framebuffer attachment.
 * @param {Object} opts
 * @param {string} opts.name
 * @param {'color'|'depth'|'color+depth'} opts.type
 * @param {string} [opts.format='rgba8']
 * @returns {import('./types.js').Attachment}
 */
export function createAttachment({ name, type, format = 'rgba8' } = {}) {
  return {
    name,
    type,
    format,
    width: 0,
    height: 0,
    texture: null,
    framebuffer: null,
  }
}

/**
 * Initialize/resize the attachment's GPU resources.
 * @param {WebGL2RenderingContext} gl
 * @param {import('./types.js').Attachment} attachment
 * @param {number} width
 * @param {number} height
 */
export function initAttachment(gl, attachment, width, height) {
  if (attachment.width === width && attachment.height === height) return

  // Clean up old resources
  if (attachment.texture) gl.deleteTexture(attachment.texture)
  if (attachment.framebuffer) gl.deleteFramebuffer(attachment.framebuffer)

  attachment.width = width
  attachment.height = height

  // Create texture
  attachment.texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, attachment.texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  if (attachment.type === 'depth' || attachment.type === 'color+depth') {
    if (attachment.format === 'depth24') {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
  } else {
    const internal = attachment.format === 'rgba16f' ? gl.RGBA16F : gl.RGBA8
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  }

  // Create framebuffer
  attachment.framebuffer = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, attachment.framebuffer)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, attachment.texture, 0)

  if (attachment.type === 'color+depth') {
    const depthRb = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRb)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRb)
    attachment._depthRb = depthRb
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}

/**
 * Dispose attachment GPU resources.
 * @param {WebGL2RenderingContext} gl
 * @param {import('./types.js').Attachment} attachment
 */
export function disposeAttachment(gl, attachment) {
  if (attachment.texture) { gl.deleteTexture(attachment.texture); attachment.texture = null }
  if (attachment.framebuffer) { gl.deleteFramebuffer(attachment.framebuffer); attachment.framebuffer = null }
  if (attachment._depthRb) { gl.deleteRenderbuffer(attachment._depthRb); attachment._depthRb = null }
}

export default { createAttachment, initAttachment, disposeAttachment }
