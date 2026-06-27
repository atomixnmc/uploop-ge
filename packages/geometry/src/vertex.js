/**
 * VertexFormat — Describes the layout of vertex attributes in a buffer.
 *
 * A VertexFormat defines which attributes exist (position, normal, uv, etc.),
 * their types, and byte offsets within a vertex. Used to configure GPU
 * vertex input state and to compute interleaved buffer layouts.
 *
 * Standard attributes:
 *   position  — vec3 (12 bytes)
 *   normal    — vec3 (12 bytes)
 *   uv        — vec2 (8 bytes)
 *   uv2       — vec2 (8 bytes)
 *   color     — vec4 (16 bytes) or vec4 uint8 normalized (4 bytes)
 *   tangent   — vec4 (16 bytes)
 *   joint     — vec4 (16 bytes) — bone indices
 *   weight    — vec4 (16 bytes) — bone weights
 */

const TYPE_SIZES = {
  float: 4,
  vec2: 8,
  vec3: 12,
  vec4: 16,
  mat3: 36,
  mat4: 64,
  uint8: 1,
}

const TYPE_COUNTS = {
  float: 1,
  vec2: 2,
  vec3: 3,
  vec4: 4,
  mat3: 9,
  mat4: 16,
  uint8: 1,
}

/**
 * Create a vertex format from an attribute list.
 *
 * @param {string[]} attributes — ordered attribute names
 * @param {Object<string, {type: string, count?: number}>} [overrides]
 * @returns {VertexFormat}
 *
 * @example
 *   VertexFormat(['position', 'normal', 'uv'])
 *   VertexFormat(['position', 'color'], { color: { type: 'uint8', count: 4 } })
 */
export function VertexFormat(attributes, overrides = {}) {
  const layout = {}
  let offset = 0

  for (const name of attributes) {
    const override = overrides[name] || {}
    const type = override.type || defaultType(name)
    const count = override.count || TYPE_COUNTS[type]
    const size = TYPE_SIZES[type]
    const byteSize = size // bytes per attribute

    layout[name] = { type, count, offset, byteSize }

    offset += byteSize
  }

  return {
    attributes,
    layout,
    stride: offset,
    /** Get the byte offset of an attribute */
    offsetOf(name) {
      return layout[name]?.offset ?? -1
    },
    /** Get the total vertex stride in bytes */
    get stride() { return offset },
    /** Check if this format has a given attribute */
    has(name) { return name in layout },
  }
}

function defaultType(name) {
  switch (name) {
    case 'position': return 'vec3'
    case 'normal': return 'vec3'
    case 'uv': case 'uv2': return 'vec2'
    case 'color': return 'vec4'
    case 'tangent': return 'vec4'
    case 'joint': return 'vec4'
    case 'weight': return 'vec4'
    default: return 'float'
  }
}

/** Common vertex formats */
export const Formats = {
  /** Position only — for debug wireframes, particles */
  P: VertexFormat(['position']),
  /** Position + color */
  PC: VertexFormat(['position', 'color']),
  /** Position + UV — for unlit textured */
  PU: VertexFormat(['position', 'uv']),
  /** Position + normal — for flat shaded */
  PN: VertexFormat(['position', 'normal']),
  /** Position + normal + UV — the standard format */
  PNU: VertexFormat(['position', 'normal', 'uv']),
  /** Position + normal + UV + tangent — for normal-mapped surfaces */
  PNUT: VertexFormat(['position', 'normal', 'uv', 'tangent']),
  /** Position + normal + UV + joint + weight — for skinned meshes */
  PNUJW: VertexFormat(['position', 'normal', 'uv', 'joint', 'weight']),
}

export default { VertexFormat, Formats }
