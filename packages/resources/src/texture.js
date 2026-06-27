/**
 * Texture — Loading and atlas packing utilities.
 *
 * Supports image-backed textures (HTMLImageElement) for GPU upload and
 * procedural texture packing via shelf-packing algorithm.
 */

/**
 * Load an image from a URL and return metadata + element.
 * The returned `data` is an HTMLImageElement ready for texImage2D.
 *
 * @param {string} url
 * @returns {Promise<{width: number, height: number, data: HTMLImageElement}>}
 */
export function loadTexture(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, data: img })
    img.onerror = () => reject(new Error(`Failed to load texture: ${url}`))
    img.src = url
  })
}

/**
 * Pack multiple images into a single atlas using shelf-packing.
 *
 * Each image is placed left-to-right on the current shelf. When an image
 * is too wide, a new shelf starts below the tallest image on the current
 * shelf. The atlas is returned as a raw ImageData so it can be drawn onto
 * a canvas for GPU upload.
 *
 * @param {{name: string, data: HTMLImageElement|ImageData|HTMLCanvasElement}[]} images
 * @param {number} [maxSize=2048] — maximum atlas dimension
 * @returns {{texture: ImageData, regions: Object<string, {x:number, y:number, w:number, h:number}>}}
 */
export function createTextureAtlas(images, maxSize = 2048) {
  // Sort images by height descending for better packing
  const sorted = [...images].sort((a, b) => b.data.height - a.data.height)

  // Build a scratch canvas to read pixel data
  const scratch = document.createElement('canvas')
  const ctx = scratch.getContext('2d')

  const regions = {}
  let atlasWidth = 0
  let atlasHeight = 0

  // Shelf state
  let shelfX = 0
  let shelfY = 0
  let shelfHeight = 0

  for (const { name, data } of sorted) {
    const w = data.width ?? data.naturalWidth
    const h = data.height ?? data.naturalHeight

    // If image doesn't fit on current shelf, start a new one
    if (shelfX + w > maxSize) {
      shelfX = 0
      shelfY += shelfHeight
      shelfHeight = 0
    }

    // If image is taller than the shelf, grow shelf height
    if (h > shelfHeight) shelfHeight = h

    // If we overflow atlas height, expand (clamped to maxSize)
    if (shelfY + h > maxSize) {
      throw new Error(`TextureAtlas overflow: cannot fit "${name}" (${w}x${h}) into ${maxSize}x${maxSize}`)
    }

    regions[name] = { x: shelfX, y: shelfY, w, h }
    atlasWidth = Math.max(atlasWidth, shelfX + w)
    atlasHeight = Math.max(atlasHeight, shelfY + h)

    shelfX += w
  }

  // Round atlas dimensions up to power-of-two (GPU friendly)
  atlasWidth = nextPow2(atlasWidth)
  atlasHeight = nextPow2(atlasHeight)

  // Render images into the atlas
  scratch.width = atlasWidth
  scratch.height = atlasHeight
  ctx.clearRect(0, 0, atlasWidth, atlasHeight)

  for (const { name, data } of images) {
    const r = regions[name]
    if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement) {
      ctx.drawImage(data, r.x, r.y, r.w, r.h)
    } else if (data instanceof ImageData) {
      // Draw ImageData via an offscreen canvas
      const tmp = document.createElement('canvas')
      tmp.width = r.w
      tmp.height = r.h
      tmp.getContext('2d').putImageData(data, 0, 0)
      ctx.drawImage(tmp, r.x, r.y, r.w, r.h)
    }
  }

  const texture = ctx.getImageData(0, 0, atlasWidth, atlasHeight)

  return { texture, regions }
}

function nextPow2(n) {
  let v = 1
  while (v < n) v <<= 1
  return v
}

export default { loadTexture, createTextureAtlas }
