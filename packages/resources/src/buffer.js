/**
 * Buffer Utilities — Pre-allocated buffer pools and per-frame ring buffers
 * for efficient GPU data uploads.
 */

/**
 * Create a BufferPool that reuses ArrayBuffers to avoid GC pressure.
 *
 * @param {Object} [opts]
 * @param {number} [opts.blockSize=65536] — allocation block size in bytes
 * @returns {BufferPool}
 */
export function BufferPool({ blockSize = 65536 } = {}) {
  /** @type {ArrayBuffer[]} */
  const free = []
  let totalAllocated = 0

  /**
   * Acquire a buffer of at least `size` bytes. Returns a pooled buffer
   * if one is available, otherwise allocates a new one.
   *
   * @param {number} size — minimum size in bytes
   * @returns {ArrayBuffer}
   */
  function acquire(size) {
    // Find the smallest free buffer that fits
    let bestIdx = -1
    let bestSize = Infinity
    for (let i = 0; i < free.length; i++) {
      if (free[i].byteLength >= size && free[i].byteLength < bestSize) {
        bestIdx = i
        bestSize = free[i].byteLength
      }
    }

    if (bestIdx !== -1) {
      const buf = free[bestIdx]
      // Remove by swapping with last
      free[bestIdx] = free[free.length - 1]
      free.pop()
      return buf
    }

    // Allocate a new block (round up to blockSize)
    const allocSize = Math.max(size, blockSize)
    const aligned = Math.ceil(allocSize / blockSize) * blockSize
    totalAllocated += aligned
    return new ArrayBuffer(aligned)
  }

  /**
   * Return a buffer to the pool for reuse.
   * @param {ArrayBuffer} buffer
   */
  function release(buffer) {
    free.push(buffer)
  }

  return {
    acquire,
    release,
    /** Total bytes allocated since creation */
    get stats() {
      return { totalAllocated, freeCount: free.length, freeBytes: free.reduce((s, b) => s + b.byteLength, 0) }
    },
  }
}

/**
 * Create a DynamicBufferRing for per-frame sub-allocations.
 *
 * Intended for uniform buffers, instance data, and other per-frame
 * uploads. Call `reset()` each frame to rewind the ring.
 *
 * @param {Object} [opts]
 * @param {number} [opts.size=262144] — total ring size in bytes (256 KB)
 * @returns {DynamicBufferRing}
 */
export function DynamicBufferRing({ size = 262144 } = {}) {
  const buffer = new ArrayBuffer(size)
  let offset = 0

  /**
   * Sub-allocate `n` bytes from the ring.
   *
   * @param {number} n — bytes to allocate
   * @returns {{buffer: ArrayBuffer, offset: number}}
   */
  function allocate(n) {
    if (offset + n > size) {
      throw new Error(`DynamicBufferRing overflow: ${offset + n} > ${size}`)
    }
    const start = offset
    offset += n
    return { buffer, offset: start }
  }

  /** Rewind the ring to the start. Call once per frame. */
  function reset() {
    offset = 0
  }

  return { allocate, reset, get size() { return size }, get used() { return offset } }
}

export default { BufferPool, DynamicBufferRing }
