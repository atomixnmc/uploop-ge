/**
 * Texture — 2D and cubemap texture creation, mipmap generation,
 * and sampler configuration.
 */

/**
 * Create a 2D texture.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {TextureConfig} config
 * @returns {{ texture: WebGLTexture, width: number, height: number }}
 */
export function createTexture(gl, {
  width,
  height,
  data = null,
  format = 'rgba8',
  internalFormat,
  type,
  minFilter = 'linear_mipmap_linear',
  magFilter = 'linear',
  wrapS = 'repeat',
  wrapT = 'repeat',
  generateMipmaps = true,
  flipY = true,
}) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)

  // Unpack alignment for tight RGBA
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY)

  const { internal, srcFormat, srcType } = resolveFormat(gl, format, internalFormat, type)

  gl.texImage2D(gl.TEXTURE_2D, 0, internal, width, height, 0, srcFormat, srcType, data)

  if (generateMipmaps && isPowerOf2(width) && isPowerOf2(height)) {
    gl.generateMipmap(gl.TEXTURE_2D)
  }

  // Sampler params
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter(gl, minFilter))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter(gl, magFilter))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap(gl, wrapS))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap(gl, wrapT))

  gl.bindTexture(gl.TEXTURE_2D, null)

  return { texture, width, height }
}

/**
 * Create a texture from an HTMLImageElement or ImageData.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {HTMLImageElement|ImageData|HTMLCanvasElement} source
 * @param {Object} [opts] — same as createTexture options
 */
export function createTextureFromImage(gl, source, opts = {}) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY !== false)

  const fmt = resolveFormat(gl, opts.format || 'rgba8')
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, fmt.srcFormat, fmt.srcType, source)

  if (opts.generateMipmaps !== false) {
    gl.generateMipmap(gl.TEXTURE_2D)
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter(gl, opts.minFilter || 'linear_mipmap_linear'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter(gl, opts.magFilter || 'linear'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap(gl, opts.wrapS || 'repeat'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap(gl, opts.wrapT || 'repeat'))

  gl.bindTexture(gl.TEXTURE_2D, null)

  return { texture, width: source.width || source.videoWidth, height: source.height || source.videoHeight }
}

/**
 * Create a cubemap texture from 6 face images.
 */
export function createCubemap(gl, faces, opts = {}) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)

  const targets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
  ]

  for (let i = 0; i < 6; i++) {
    const face = faces[i]
    if (face) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face)
    }
  }

  if (opts.generateMipmaps !== false) {
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP)
  }

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, glFilter(gl, opts.minFilter || 'linear_mipmap_linear'))
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, glFilter(gl, opts.magFilter || 'linear'))
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, glWrap(gl, 'clamp_to_edge'))
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, glWrap(gl, 'clamp_to_edge'))
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, glWrap(gl, 'clamp_to_edge'))

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
  return texture
}

/**
 * Bind a texture to a texture unit.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {WebGLTexture} texture
 * @param {number} unit — texture unit index (0..N)
 * @param {'2d'|'cube'} [target='2d']
 */
export function bindTexture(gl, texture, unit = 0, target = '2d') {
  gl.activeTexture(gl.TEXTURE0 + unit)
  const t = target === 'cube' ? gl.TEXTURE_CUBE_MAP : gl.TEXTURE_2D
  gl.bindTexture(t, texture)
}

/** Delete a texture */
export function deleteTexture(gl, texture) {
  gl.deleteTexture(texture)
}

// --- Helpers ---

function resolveFormat(gl, format, internalFormat, type) {
  // Default: RGBA8
  let internal = gl.RGBA8
  let srcFormat = gl.RGBA
  let srcType = gl.UNSIGNED_BYTE

  switch (format) {
    case 'rgba8':
      internal = internalFormat || gl.RGBA8
      srcFormat = gl.RGBA
      srcType = type || gl.UNSIGNED_BYTE
      break
    case 'rgb8':
      internal = internalFormat || gl.RGB8
      srcFormat = gl.RGB
      srcType = type || gl.UNSIGNED_BYTE
      break
    case 'rgba16f':
      internal = internalFormat || gl.RGBA16F
      srcFormat = gl.RGBA
      srcType = type || gl.HALF_FLOAT
      break
    case 'rgba32f':
      internal = internalFormat || gl.RGBA32F
      srcFormat = gl.RGBA
      srcType = type || gl.FLOAT
      break
    case 'depth':
      internal = internalFormat || gl.DEPTH_COMPONENT24
      srcFormat = gl.DEPTH_COMPONENT
      srcType = type || gl.UNSIGNED_INT
      break
    case 'depth24_stencil8':
      internal = internalFormat || gl.DEPTH24_STENCIL8
      srcFormat = gl.DEPTH_STENCIL
      srcType = type || gl.UNSIGNED_INT_24_8
      break
    case 'r8':
      internal = internalFormat || gl.R8
      srcFormat = gl.RED
      srcType = type || gl.UNSIGNED_BYTE
      break
    default:
      internal = internalFormat || gl.RGBA8
      srcFormat = gl.RGBA
      srcType = type || gl.UNSIGNED_BYTE
  }

  return { internal, srcFormat, srcType }
}

function glFilter(gl, filter) {
  switch (filter) {
    case 'nearest': return gl.NEAREST
    case 'linear': return gl.LINEAR
    case 'nearest_mipmap_nearest': return gl.NEAREST_MIPMAP_NEAREST
    case 'linear_mipmap_nearest': return gl.LINEAR_MIPMAP_NEAREST
    case 'nearest_mipmap_linear': return gl.NEAREST_MIPMAP_LINEAR
    case 'linear_mipmap_linear': return gl.LINEAR_MIPMAP_LINEAR
    default: return gl.LINEAR
  }
}

function glWrap(gl, wrap) {
  switch (wrap) {
    case 'repeat': return gl.REPEAT
    case 'clamp_to_edge': return gl.CLAMP_TO_EDGE
    case 'mirrored_repeat': return gl.MIRRORED_REPEAT
    default: return gl.REPEAT
  }
}

function isPowerOf2(n) { return (n & (n - 1)) === 0 }

export default { createTexture, createTextureFromImage, createCubemap,
  bindTexture, deleteTexture }
