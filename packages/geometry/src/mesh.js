/**
 * Mesh — Vertex + Index data with a VertexFormat.
 *
 * A Mesh is a data structure holding vertex attributes (as a single interleaved
 * Float32Array or separate arrays), optional index buffer, and draw mode.
 * Ready for direct GPU buffer upload.
 *
 * @depends @uploop/math (vec3 used for bbox calculation)
 */

import { vec3 } from '@uploop/math'

/**
 * Create a mesh.
 *
 * @param {Object} opts
 * @param {Float32Array} opts.vertices — interleaved vertex data
 * @param {Uint16Array|Uint32Array} [opts.indices] — index buffer
 * @param {VertexFormat} opts.format — vertex attribute layout
 * @param {'triangles'|'lines'|'points'|'triangle_strip'|'line_strip'} [opts.drawMode='triangles']
 * @returns {Mesh}
 */
export function Mesh({ vertices, indices, format, drawMode = 'triangles' }) {
  const vertexCount = vertices ? Math.floor(vertices.length / (format.stride / 4)) : 0
  const indexCount = indices ? indices.length : 0

  const mesh = {
    vertices,
    indices,
    format,
    drawMode,
    vertexCount,
    indexCount,

    /** Number of triangles (for indexed triangle meshes) */
    get triangleCount() {
      if (drawMode !== 'triangles' && drawMode !== 'triangle_strip') return 0
      if (indices) return Math.floor(indices.length / 3)
      return Math.floor(vertexCount / 3)
    },

    /** Compute bounding box from position attribute */
    computeBBox() {
      if (!vertices || !format.has('position')) return null
      const off = format.offsetOf('position') / 4
      const stride = format.stride / 4
      let minX = Infinity, minY = Infinity, minZ = Infinity
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
      for (let i = 0; i < vertexCount; i++) {
        const base = i * stride + off
        const x = vertices[base], y = vertices[base + 1], z = vertices[base + 2]
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
        if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
      }
      return {
        min: vec3.create(minX, minY, minZ),
        max: vec3.create(maxX, maxY, maxZ),
      }
    },

    /** Create a shallow copy with new vertices/indices (for instancing) */
    clone() {
      return Mesh({
        vertices: vertices ? new Float32Array(vertices) : null,
        indices: indices ? new (indices instanceof Uint32Array ? Uint32Array : Uint16Array)(indices) : null,
        format,
        drawMode,
      })
    },

    /** Free GPU-uploadable data (call after uploading) */
    dispose() {
      // No-op on JS side; GPU resources are managed by renderer
    },
  }

  return mesh
}

export default { Mesh }
