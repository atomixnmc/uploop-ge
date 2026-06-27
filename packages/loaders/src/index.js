/**
 * @uploop/loaders — Model & Texture Loaders
 *
 * Fetches and parses 3D model formats (OBJ, GLTF 2.0) including
 * animations, skins, and morph targets. Loads textures from URLs.
 *
 * Usage:
 *   import { loadGLTF, loadOBJ, loadTexture } from '@uploop/loaders'
 *   const gltf = await loadGLTF('https://example.com/model.gltf')
 *   const tex = await loadTexture(gl, 'https://example.com/texture.png')
 */

export { loadOBJ, parseOBJ } from './obj.js'
export { loadGLTF, parseGLTF } from './gltf.js'
export { loadTexture, loadCubemap } from './texture.js'
export { loadModel } from './loader.js'
