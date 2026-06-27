/**
 * @uploop/resources — GPU Resource Management
 *
 * Texture loading (image, HDR, cubemap), texture atlas packing, buffer pools
 * for dynamic uploads, asset loader (GLTF, OBJ), resource cache with LRU
 * eviction. All resources are trackable HyperGraph resource nodes.
 */

export { loadTexture, createTextureAtlas } from './texture.js'
export { BufferPool, DynamicBufferRing } from './buffer.js'
export { loadModel, loadImage, loadShaderSource, loadOBJ, loadGLTF } from './loader.js'
export { ResourceCache } from './cache.js'
