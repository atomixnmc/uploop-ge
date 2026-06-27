/**
 * Loader — Asset loading utilities for images, shaders, OBJ, and GLTF.
 *
 * All loaders return Promises. OBJ parsing is synchronous from source text.
 * GLTF parsing fetches the .gltf JSON and resolves buffer URIs.
 *
 * @depends @uploop/math, @uploop/geometry
 */

import { Mesh, Formats } from '@uploop/geometry'

const { PNU } = Formats

// ─── Image ─────────────────────────────────────────────────────────────────

/**
 * Load an image as an HTMLImageElement.
 *
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

// ─── Shader Source ─────────────────────────────────────────────────────────

/**
 * Load a shader source file as plain text.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export function loadShaderSource(url) {
  return fetch(url).then(r => {
    if (!r.ok) throw new Error(`Failed to load shader: ${url} (${r.status})`)
    return r.text()
  })
}

// ─── OBJ ───────────────────────────────────────────────────────────────────

/**
 * Parse Wavefront OBJ text into a Mesh with PNU vertex format.
 *
 * Handles: v, vn, vt, f (triangulated quads), o, g (ignored), comments.
 * Unused vertices are stripped during face indexing.
 *
 * @param {string} source — OBJ file contents
 * @returns {import('@uploop/geometry').Mesh}
 */
export function loadOBJ(source) {
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  const vertexMap = new Map()

  const lines = source.split(/\r?\n/)

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const parts = line.split(/\s+/)
    const cmd = parts[0]

    if (cmd === 'v') {
      positions.push(+parts[1], +parts[2], +parts[3])
    } else if (cmd === 'vn') {
      normals.push(+parts[1], +parts[2], +parts[3])
    } else if (cmd === 'vt') {
      uvs.push(+parts[1], parts[2] !== undefined ? +parts[2] : 0)
    } else if (cmd === 'f') {
      const faceVerts = []
      for (let i = 1; i < parts.length; i++) {
        const key = parts[i]
        let idx = vertexMap.get(key)
        if (idx === undefined) {
          idx = vertexMap.size
          vertexMap.set(key, idx)
        }
        faceVerts.push(idx)
      }

      // Fan triangulation for quads / n-gons
      for (let i = 1; i < faceVerts.length - 1; i++) {
        indices.push(faceVerts[0], faceVerts[i], faceVerts[i + 1])
      }
    }
  }

  // Build interleaved PNU vertex buffer
  const vertexCount = vertexMap.size
  const stride = 8 // 3 pos + 3 norm + 2 uv
  const vertices = new Float32Array(vertexCount * stride)

  // Reset defaults
  for (let i = 0; i < vertexCount; i++) {
    const base = i * stride
    vertices[base + 3] = 0  // normal
    vertices[base + 4] = 1  // normal (default up)
    vertices[base + 5] = 0  // normal
    vertices[base + 6] = 0  // uv
    vertices[base + 7] = 0  // uv
  }

  for (const [key, vi] of vertexMap) {
    const [p, t, n] = key.split('/')
    const base = vi * stride

    // Position
    const pi = (+p - 1) * 3
    if (pi >= 0 && pi + 2 < positions.length) {
      vertices[base]     = positions[pi]
      vertices[base + 1] = positions[pi + 1]
      vertices[base + 2] = positions[pi + 2]
    }

    // UV
    if (t !== undefined) {
      const ti = (+t - 1) * 2
      if (ti >= 0 && ti + 1 < uvs.length) {
        vertices[base + 6] = uvs[ti]
        vertices[base + 7] = 1 - uvs[ti + 1] // flip V for WebGL
      }
    }

    // Normal
    if (n !== undefined) {
      const ni = (+n - 1) * 3
      if (ni >= 0 && ni + 2 < normals.length) {
        vertices[base + 3] = normals[ni]
        vertices[base + 4] = normals[ni + 1]
        vertices[base + 5] = normals[ni + 2]
      }
    }
  }

  return Mesh({
    vertices,
    indices: indices.length <= 65535
      ? new Uint16Array(indices)
      : new Uint32Array(indices),
    format: PNU,
    drawMode: 'triangles',
  })
}

// ─── GLTF ──────────────────────────────────────────────────────────────────

/**
 * Load a GLTF 2.0 file and return parsed meshes + scene graph.
 *
 * Fetches the .gltf JSON, resolves buffer URIs relative to the document URL,
 * and extracts mesh primitives into {@link Mesh} objects with PNU format.
 *
 * @param {string} url — URL of the .gltf file
 * @returns {Promise<{meshes: import('@uploop/geometry').Mesh[], nodes: {name:string, meshIndex:number, translation:number[], rotation:number[], scale:number[], children:number[]}[], scene: number}>}
 */
export async function loadGLTF(url) {
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Failed to load GLTF: ${url} (${resp.status})`)
  const gltf = await resp.json()

  // Load binary buffer(s)
  const buffers = await Promise.all((gltf.buffers || []).map(async buf => {
    const bufUrl = baseUrl + buf.uri
    const r = await fetch(bufUrl)
    const data = await r.arrayBuffer()
    return new DataView(data)
  }))

  // Resolve an accessor into a typed array
  function readAccessor(accessorIdx) {
    if (accessorIdx === undefined) return null
    const acc = gltf.accessors[accessorIdx]
    const bv = gltf.bufferViews[acc.bufferView]
    const buf = buffers[bv.buffer]
    const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0)

    const componentType = acc.componentType
    const count = acc.count * typeCount(acc.type)

    let TypedArray
    switch (componentType) {
      case 5120: TypedArray = Int8Array; break
      case 5121: TypedArray = Uint8Array; break
      case 5122: TypedArray = Int16Array; break
      case 5123: TypedArray = Uint16Array; break
      case 5125: TypedArray = Uint32Array; break
      case 5126: TypedArray = Float32Array; break
      default: return null
    }

    const byteLength = count * TypedArray.BYTES_PER_ELEMENT
    return new TypedArray(buf.buffer, buf.byteOffset + offset, count)
  }

  // Convert glTF primitives to Meshes
  const meshes = (gltf.meshes || []).map(mesh => {
    // Only handle the first primitive for now
    const prim = mesh.primitives[0]
    const pos = readAccessor(prim.attributes.POSITION)
    const nrm = readAccessor(prim.attributes.NORMAL)
    const uv  = readAccessor(prim.attributes.TEXCOORD_0)
    const idx = readAccessor(prim.indices)

    const vertexCount = pos.length / 3
    const stride = 8
    const vertices = new Float32Array(vertexCount * stride)

    for (let v = 0; v < vertexCount; v++) {
      const base = v * stride
      vertices[base]     = pos[v * 3]
      vertices[base + 1] = pos[v * 3 + 1]
      vertices[base + 2] = pos[v * 3 + 2]
      if (nrm) {
        vertices[base + 3] = nrm[v * 3]
        vertices[base + 4] = nrm[v * 3 + 1]
        vertices[base + 5] = nrm[v * 3 + 2]
      }
      if (uv) {
        vertices[base + 6] = uv[v * 2]
        vertices[base + 7] = uv[v * 2 + 1]
      }
    }

    let indicesArray = null
    if (idx) {
      indicesArray = idx instanceof Uint16Array || idx instanceof Uint32Array
        ? new (idx.constructor)(idx)
        : new Uint16Array(idx)
    }

    return Mesh({ vertices, indices: indicesArray, format: PNU, drawMode: 'triangles' })
  })

  // Extract node hierarchy
  const nodes = (gltf.nodes || []).map(n => ({
    name: n.name || '',
    meshIndex: n.mesh ?? -1,
    translation: n.translation || [0, 0, 0],
    rotation: n.rotation || [0, 0, 0, 1],
    scale: n.scale || [1, 1, 1],
    children: n.children || [],
  }))

  return { meshes, nodes, scene: gltf.scene ?? 0 }
}

// ─── Auto-detect ───────────────────────────────────────────────────────────

/**
 * Load a 3D model, auto-detecting format from file extension.
 *
 * Supported: .obj, .gltf
 *
 * @param {string} url
 * @returns {Promise<import('@uploop/geometry').Mesh|{meshes: import('@uploop/geometry').Mesh[], nodes: any[], scene: number}>}
 */
export function loadModel(url) {
  const ext = url.split('.').pop().toLowerCase()
  if (ext === 'obj') {
    return fetch(url)
      .then(r => { if (!r.ok) throw new Error(`Failed to load model: ${url}`); return r.text() })
      .then(source => loadOBJ(source))
  }
  if (ext === 'gltf') {
    return loadGLTF(url)
  }
  throw new Error(`Unsupported model format: .${ext}`)
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function typeCount(gltfType) {
  switch (gltfType) {
    case 'SCALAR': return 1
    case 'VEC2':   return 2
    case 'VEC3':   return 3
    case 'VEC4':   return 4
    case 'MAT2':   return 4
    case 'MAT3':   return 9
    case 'MAT4':   return 16
    default:       return 1
  }
}

export default { loadImage, loadShaderSource, loadOBJ, loadGLTF, loadModel }
