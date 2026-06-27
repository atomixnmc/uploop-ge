/**
 * Attribute Layout — Maps vertex format attributes to shader attribute locations.
 *
 * Creates the VAO configuration that tells WebGL how to read vertex data
 * from buffers matching a VertexFormat.
 */

/**
 * Create an attribute layout from a VertexFormat and shader attribute info.
 *
 * Maps shader attribute names (e.g. 'aPosition') to vertex format attributes
 * (e.g. 'position'). Tries exact match first, then strips 'a' prefix.
 *
 * @param {VertexFormat} format — vertex data layout
 * @param {Object<string, AttributeInfo>} shaderAttrs — from compiled shader
 * @returns {AttributeLayout}
 */
export function createAttributeLayout(format, shaderAttrs) {
  const layout = []

  for (const [shaderName, attrInfo] of Object.entries(shaderAttrs)) {
    // Try exact match first, then strip leading 'a' and lowercase first char
    let fmtAttr = format.layout[shaderName]
    if (!fmtAttr) {
      // Strip 'a' prefix and lowercase (e.g., aPosition→position, aUV→uv)
      const stripped = shaderName.startsWith('a') && shaderName.length > 1
        ? shaderName.slice(1).toLowerCase()
        : shaderName
      fmtAttr = format.layout[stripped]
    }
    if (!fmtAttr) continue

    const GL = typeof WebGL2RenderingContext !== 'undefined' ? WebGL2RenderingContext : { FLOAT: 0x1406 }

    layout.push({
      name: shaderName,
      location: attrInfo.location,
      size: fmtAttr.count,
      type: GL.FLOAT, // All our vertex data is Float32
      normalized: fmtAttr.type === 'uint8', // uint8 color attributes are normalized
      stride: format.stride,
      offset: fmtAttr.offset,
    })
  }

  return layout
}

/**
 * Apply attribute layout to WebGL — set up vertexAttribPointer + enable.
 * Assumes a VAO is bound (or default VAO if using WebGL 2 default).
 *
 * @param {WebGL2RenderingContext} gl
 * @param {AttributeLayout} layout
 */
export function applyAttributeLayout(gl, layout) {
  for (const attr of layout) {
    gl.enableVertexAttribArray(attr.location)
    gl.vertexAttribPointer(
      attr.location,
      attr.size,
      attr.type,
      attr.normalized,
      attr.stride,
      attr.offset
    )
  }
}

/**
 * Compute the WebGL type constant for a given format type string.
 */
export function glType(type) {
  const gl = WebGL2RenderingContext
  switch (type) {
    case 'float': return gl.FLOAT
    case 'vec2': return gl.FLOAT
    case 'vec3': return gl.FLOAT
    case 'vec4': return gl.FLOAT
    case 'uint8': return gl.UNSIGNED_BYTE
    default: return gl.FLOAT
  }
}

export default { createAttributeLayout, applyAttributeLayout, glType }
