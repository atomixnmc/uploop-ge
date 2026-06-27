/**
 * @uploop/geometry — Mesh & Geometry
 *
 * Vertex format descriptors, mesh data structures, primitive generators,
 * bounding volume hierarchy for spatial queries. All vertex data uses
 * TypedArrays for direct GPU buffer upload.
 */

export { VertexFormat, Formats } from './vertex.js'
export { Mesh } from './mesh.js'
export {
  createCube,
  createSphere,
  createPlane,
  createCylinder,
  createTorus,
} from './primitives.js'
export {
  interleave,
  strideOf,
  vertexCount,
  extractAttribute,
  packNormal,
  computeFlatNormals,
  computeSmoothNormals,
} from './buffer.js'
export { buildBVH, rayQuery, nodeCount, maxDepth } from './bvh.js'
