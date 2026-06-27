/**
 * Buffer Utilities — Interleave separate attribute arrays into a single
 * vertex buffer, and compute strides for vertex formats.
 */

import { vec3, vec2 } from '@uploop/math'

/**
 * Interleave separate attribute arrays into one Float32Array.
 *
 * @param {VertexFormat} format
 * @param {Object<string, Float32Array|number[]>} arrays — per-attribute data
 * @param {number} vertexCount — number of vertices
 * @returns {Float32Array} interleaved vertex buffer
 */
export function interleave(format, arrays, vertexCount) {
  const stride = format.stride / 4 // stride in floats
  const out = new Float32Array(vertexCount * stride)

  for (const name of format.attributes) {
    const { type, offset } = format.layout[name]
    const data = arrays[name]
    if (!data) continue

    const off = offset / 4 // offset in floats
    const count = typeCount(type)

    for (let v = 0; v < vertexCount; v++) {
      const base = v * stride + off
      for (let c = 0; c < count; c++) {
        out[base + c] = data[v * count + c] ?? 0
      }
    }
  }

  return out
}

/**
 * Compute total stride in bytes for a VertexFormat.
 * @param {VertexFormat} format
 * @returns {number}
 */
export function strideOf(format) {
  return format.stride
}

/**
 * Compute number of vertices from a buffer and format.
 * @param {Float32Array} buffer
 * @param {VertexFormat} format
 * @returns {number}
 */
export function vertexCount(buffer, format) {
  return Math.floor(buffer.length / (format.stride / 4))
}

/**
 * Extract a single attribute from an interleaved buffer.
 * @param {Float32Array} buffer
 * @param {VertexFormat} format
 * @param {string} name
 * @returns {Float32Array}
 */
export function extractAttribute(buffer, format, name) {
  const vc = vertexCount(buffer, format)
  const { offset, type } = format.layout[name]
  const count = typeCount(type)
  const off = offset / 4
  const stride = format.stride / 4
  const out = new Float32Array(vc * count)

  for (let v = 0; v < vc; v++) {
    const base = v * stride + off
    for (let c = 0; c < count; c++) {
      out[v * count + c] = buffer[base + c]
    }
  }
  return out
}

/**
 * Pack a vec3 into a 32-bit float for compact storage (half-float-like but with arithmetic).
 * Useful for normals: vec3 → [0,1] range packed into float.
 * Note: This is lossy. For precision, keep as vec3.
 */
export function packNormal(nx, ny, nz) {
  // Pack signed unit vector into [0, 1] range
  const x = Math.round((nx * 0.5 + 0.5) * 255)
  const y = Math.round((ny * 0.5 + 0.5) * 255)
  return (x << 8) | y
}

/** Recalculate normals from positions + indices (flat shading) */
export function computeFlatNormals(positions, indices) {
  const normals = new Float32Array(positions.length)
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3
    const ax = positions[a], ay = positions[a + 1], az = positions[a + 2]
    const bx = positions[b], by = positions[b + 1], bz = positions[b + 2]
    const cx = positions[c], cy = positions[c + 1], cz = positions[c + 2]
    // edge vectors
    const ux = bx - ax, uy = by - ay, uz = bz - az
    const vx = cx - ax, vy = cy - ay, vz = cz - az
    // cross product
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    const rlen = 1 / len
    // Assign to all three vertices of the triangle
    for (const idx of [a, b, c]) {
      normals[idx] += nx * rlen
      normals[idx + 1] += ny * rlen
      normals[idx + 2] += nz * rlen
    }
  }
  // Normalize
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.sqrt(normals[i]*normals[i] + normals[i+1]*normals[i+1] + normals[i+2]*normals[i+2]) || 1
    normals[i] /= len
    normals[i + 1] /= len
    normals[i + 2] /= len
  }
  return normals
}

/** Recalculate normals from positions + indices (smooth — average per vertex) */
export function computeSmoothNormals(positions, indices) {
  const normals = new Float32Array(positions.length)
  const counts = new Uint32Array(positions.length / 3)

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3
    const ux = positions[b] - positions[a], uy = positions[b+1] - positions[a+1], uz = positions[b+2] - positions[a+2]
    const vx = positions[c] - positions[a], vy = positions[c+1] - positions[a+1], vz = positions[c+2] - positions[a+2]
    const nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx
    for (const idx of [a, b, c]) {
      normals[idx] += nx
      normals[idx+1] += ny
      normals[idx+2] += nz
      counts[idx/3]++
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const c = counts[i/3] || 1
    normals[i] /= c
    normals[i+1] /= c
    normals[i+2] /= c
    const len = Math.sqrt(normals[i]*normals[i] + normals[i+1]*normals[i+1] + normals[i+2]*normals[i+2]) || 1
    normals[i] /= len
    normals[i+1] /= len
    normals[i+2] /= len
  }
  return normals
}

function typeCount(type) {
  switch (type) {
    case 'float': case 'uint8': return 1
    case 'vec2': return 2
    case 'vec3': return 3
    case 'vec4': return 4
    default: return 1
  }
}

export default { interleave, strideOf, vertexCount, extractAttribute, packNormal,
  computeFlatNormals, computeSmoothNormals }
