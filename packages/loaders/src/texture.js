/**
 * Texture Loader — Load images from URLs and upload to WebGL.
 *
 * Supports 2D textures and cubemaps. Returns WebGL texture objects
 * ready for binding.
 *
 * @depends @uploop/math (none directly, pure WebGL)
 */

/**
 * Load an image from URL and create a WebGL 2D texture.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string} url
 * @param {Object} [opts]
 * @param {boolean} [opts.flipY=true]
 * @param {boolean} [opts.mipmaps=true]
 * @param {string} [opts.minFilter='linear_mipmap_linear']
 * @param {string} [opts.magFilter='linear']
 * @param {string} [opts.wrapS='repeat']
 * @param {string} [opts.wrapT='repeat']
 * @returns {Promise<{texture: WebGLTexture, width: number, height: number}>}
 */
export async function loadTexture(gl, url, opts = {}) {
  const img = await _loadImage(url)
  return _uploadTexture(gl, img, opts)
}

/**
 * Load 6 images and create a cubemap texture.
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string[]} urls — [px, nx, py, ny, pz, nz]
 * @param {Object} [opts]
 * @returns {Promise<WebGLTexture>}
 */
export async function loadCubemap(gl, urls, opts = {}) {
  const images = await Promise.all(urls.map(u => _loadImage(u)))

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture)

  const targets = [
    gl.TEXTURE_CUBE_MAP_POSITIVE_X, gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Y, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    gl.TEXTURE_CUBE_MAP_POSITIVE_Z, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
  ]

  for (let i = 0; i < 6; i++) {
    const img = images[i]
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(targets[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  }

  if (opts.mipmaps !== false) gl.generateMipmap(gl.TEXTURE_CUBE_MAP)

  const minF = _glFilter(gl, opts.minFilter || 'linear_mipmap_linear')
  const magF = _glFilter(gl, opts.magFilter || 'linear')

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, minF)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, magF)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE)

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
  return texture
}

// ── Internal ───────────────────────────────────────────────────────

function _loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

function _uploadTexture(gl, img, opts) {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opts.flipY !== false)

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

  if (opts.mipmaps !== false && _isPowerOf2(img.width) && _isPowerOf2(img.height)) {
    gl.generateMipmap(gl.TEXTURE_2D)
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, _glFilter(gl, opts.minFilter || 'linear_mipmap_linear'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, _glFilter(gl, opts.magFilter || 'linear'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, _glWrap(gl, opts.wrapS || 'repeat'))
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, _glWrap(gl, opts.wrapT || 'repeat'))

  gl.bindTexture(gl.TEXTURE_2D, null)

  return { texture, width: img.width, height: img.height }
}

function _glFilter(gl, f) {
  const map = { nearest: gl.NEAREST, linear: gl.LINEAR,
    nearest_mipmap_nearest: gl.NEAREST_MIPMAP_NEAREST,
    linear_mipmap_nearest: gl.LINEAR_MIPMAP_NEAREST,
    nearest_mipmap_linear: gl.NEAREST_MIPMAP_LINEAR,
    linear_mipmap_linear: gl.LINEAR_MIPMAP_LINEAR }
  return map[f] || gl.LINEAR
}

function _glWrap(gl, w) {
  const map = { repeat: gl.REPEAT, clamp_to_edge: gl.CLAMP_TO_EDGE, mirrored_repeat: gl.MIRRORED_REPEAT }
  return map[w] || gl.REPEAT
}

function _isPowerOf2(n) { return (n & (n - 1)) === 0 }

export default { loadTexture, loadCubemap }
