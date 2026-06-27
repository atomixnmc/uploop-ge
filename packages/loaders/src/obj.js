/**
 * OBJ Loader — Wavefront .obj parser.
 *
 * Parses vertex positions, normals, UVs, and face indices. Generates
 * a single Mesh in PNU (position+normal+uv) format with deduplicated
 * vertices.
 *
 * @depends @uploop/math (vec3)
 * @depends @uploop/geometry (Mesh, VertexFormat, Formats, interleave)
 */

import { vec3 } from '@uploop/math'
import { Mesh, Formats, interleave } from '@uploop/geometry'

/**
 * Parse OBJ text into a Mesh.
 * @param {string} source — OBJ file content
 * @returns {Mesh}
 */
export function parseOBJ(source) {
  const positions = []
  const normals = []
  const uvs = []
  const faceVertices = []  // [{ posIdx, uvIdx, nrmIdx }, ...]
  const faceIndices = []   // flat index array after dedup
  const vertexMap = new Map()

  const lines = source.split('\n')

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const parts = line.split(/\s+/)
    const cmd = parts[0]

    switch (cmd) {
      case 'v':
        positions.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))
        break
      case 'vn':
        normals.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]))
        break
      case 'vt':
        uvs.push(parseFloat(parts[1]), parseFloat(parts[2]))
        break
      case 'f':
        const faceVerts = []
        for (let i = 1; i < parts.length; i++) {
          const [pi, ti, ni] = parts[i].split('/').map(v => v ? parseInt(v) - 1 : 0)
          faceVerts.push([pi, ti, ni])
        }
        // Fan triangulation for quads/n-gons
        for (let i = 1; i < faceVerts.length - 1; i++) {
          for (const idx of [0, i, i + 1]) {
            const key = faceVerts[idx].join('/')
            if (!vertexMap.has(key)) {
              vertexMap.set(key, faceVertices.length)
              faceVertices.push(faceVerts[idx])
            }
            faceIndices.push(vertexMap.get(key))
          }
        }
        break
    }
  }

  // If no normals, compute flat normals
  if (normals.length === 0) {
    _computeNormals(positions, faceVertices, faceIndices, normals)
  }
  // If no UVs, fill with zeros
  if (uvs.length === 0) {
    uvs.push(0, 0)
  }

  // Build interleaved vertex data
  const vCount = faceVertices.length
  const posArr = new Float32Array(vCount * 3)
  const nrmArr = new Float32Array(vCount * 3)
  const uvArr = new Float32Array(vCount * 2)

  for (let i = 0; i < vCount; i++) {
    const [pi, ti, ni] = faceVertices[i]
    posArr[i * 3] = positions[pi * 3]
    posArr[i * 3 + 1] = positions[pi * 3 + 1]
    posArr[i * 3 + 2] = positions[pi * 3 + 2]
    if (normals.length > 0) {
      nrmArr[i * 3] = normals[ni * 3]
      nrmArr[i * 3 + 1] = normals[ni * 3 + 1]
      nrmArr[i * 3 + 2] = normals[ni * 3 + 2]
    }
    if (uvs.length > 1) {
      uvArr[i * 2] = uvs[ti * 2]
      uvArr[i * 2 + 1] = 1 - uvs[ti * 2 + 1] // flip Y
    }
  }

  const fmt = Formats.PNU

  const vertices = new Float32Array(vCount * (fmt.stride / 4))
  _interleavePNU(vertices, posArr, nrmArr, uvArr, vCount)

  return Mesh({
    vertices,
    indices: new (vCount > 65535 ? Uint32Array : Uint16Array)(faceIndices),
    format: fmt,
  })
}

function _interleavePNU(out, pos, nrm, uv, count) {
  for (let i = 0; i < count; i++) {
    const bo = i * 8  // 32 bytes / 4 = 8 floats per vertex (pos3 + nrm3 + uv2)
    const pi = i * 3, ui = i * 2
    out[bo] = pos[pi]; out[bo+1] = pos[pi+1]; out[bo+2] = pos[pi+2]
    out[bo+3] = nrm[pi]; out[bo+4] = nrm[pi+1]; out[bo+5] = nrm[pi+2]
    out[bo+6] = uv[ui]; out[bo+7] = uv[ui+1]
  }
}

function _computeNormals(pos, faceVerts, indices, out) {
  const triCount = Math.floor(indices.length / 3)
  for (let t = 0; t < triCount; t++) {
    const ai = faceVerts[indices[t * 3]][0]
    const bi = faceVerts[indices[t * 3 + 1]][0]
    const ci = faceVerts[indices[t * 3 + 2]][0]
    const ax = pos[ai*3], ay = pos[ai*3+1], az = pos[ai*3+2]
    const bx = pos[bi*3], by = pos[bi*3+1], bz = pos[bi*3+2]
    const cx = pos[ci*3], cy = pos[ci*3+1], cz = pos[ci*3+2]
    const ux = bx-ax, uy = by-ay, uz = bz-az
    const vx = cx-ax, vy = cy-ay, vz = cz-az
    const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx
    const len = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1
    for (const idx of [ai, bi, ci]) {
      out[idx*3] = nx/len; out[idx*3+1] = ny/len; out[idx*3+2] = nz/len
    }
  }
}

/**
 * Fetch and parse an OBJ file from a URL.
 * @param {string} url
 * @returns {Promise<Mesh>}
 */
export async function loadOBJ(url) {
  const resp = await fetch(url)
  const text = await resp.text()
  return parseOBJ(text)
}

export default { loadOBJ, parseOBJ }
