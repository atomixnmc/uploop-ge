/**
 * @typedef {Object} TextureData
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array|Float32Array} pixels
 * @property {'rgba8'|'rgba16f'|'rgba32f'|'depth'} format
 * @property {number} [mipLevels=1]
 *
 * @typedef {Object} TextureAtlas
 * @property {TextureData} texture
 * @property {Object<string, {x:number, y:number, w:number, h:number}>} regions
 *
 * @typedef {Object} BufferPool
 * @property {Function} acquire — get or create a buffer of given size
 * @property {Function} release — return buffer to pool
 * @property {number} size — total allocated bytes
 *
 * @typedef {Object} DynamicBufferRing
 * @property {Function} allocate — get sub-allocation, returns {buffer, offset}
 * @property {Function} reset — reset ring to start (per-frame)
 *
 * @typedef {Object} ResourceCache
 * @property {Function} get — get cached or load fresh
 * @property {Function} invalidate — force evict and reload
 * @property {Function} clear — evict all
 * @property {number} size — current cached count
 */

export default {}
