/**
 * Auto-detect model format from file extension and dispatch.
 *
 * @depends obj.js, gltf.js
 */

import { loadOBJ, parseOBJ } from './obj.js'
import { loadGLTF, parseGLTF } from './gltf.js'

/**
 * Load a 3D model from URL, auto-detecting format.
 * Supports .obj, .gltf, .glb
 *
 * @param {string} url
 * @returns {Promise<Object>} — OBJ returns { mesh }, GLTF returns { meshes, nodes, animations, skins }
 */
export async function loadModel(url) {
  const lower = url.toLowerCase()
  if (lower.endsWith('.obj')) {
    return { mesh: await loadOBJ(url), format: 'obj' }
  }
  if (lower.endsWith('.gltf') || lower.endsWith('.glb')) {
    const result = await loadGLTF(url)
    return { ...result, format: 'gltf' }
  }
  throw new Error(`Unsupported model format: ${url}`)
}

export default { loadModel }
