/**
 * @typedef {Object} VertexFormat
 * @property {string[]} attributes — ['position', 'normal', 'uv', 'color', 'tangent']
 * @property {Object<string, {type: string, count: number}>} layout
 *
 * @typedef {Object} Mesh
 * @property {Float32Array} vertices
 * @property {Uint16Array|Uint32Array} indices
 * @property {VertexFormat} format
 * @property {'triangles'|'lines'|'points'} drawMode
 *
 * @typedef {Object} BVHNode
 * @property {AABB} box
 * @property {BVHNode|null} left
 * @property {BVHNode|null} right
 * @property {number[]} triangleIndices — leaf only
 */

export default {}
