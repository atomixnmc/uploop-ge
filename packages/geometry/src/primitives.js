/**
 * Primitives — Mesh generators for common 3D shapes.
 *
 * Each function returns a Mesh with vertices (interleaved position+normal+uv)
 * and indices. All use the PNU vertex format by default.
 *
 * @depends @uploop/math
 */

import { VertexFormat, Formats } from './vertex.js'
import { Mesh } from './mesh.js'
import { interleave } from './buffer.js'
import { vec3, vec2 } from '@uploop/math'

const PNU = Formats.PNU

// --- Helpers ---

function pushVertex(verts, px, py, pz, nx, ny, nz, u, v) {
  verts.pos.push(px, py, pz)
  verts.nrm.push(nx, ny, nz)
  verts.uv.push(u, v)
}

function buildMesh(verts, indices, format = PNU) {
  const vCount = verts.pos.length / 3
  const vertices = interleave(format, {
    position: new Float32Array(verts.pos),
    normal: new Float32Array(verts.nrm),
    uv: new Float32Array(verts.uv),
  }, vCount)
  return Mesh({
    vertices,
    indices: new (vCount > 65535 ? Uint32Array : Uint16Array)(indices),
    format,
  })
}

// --- Cube ---

/**
 * Create an axis-aligned unit cube centered at origin.
 * @param {number} [width=1]
 * @param {number} [height=1]
 * @param {number} [depth=1]
 * @param {number} [widthSegs=1]
 * @param {number} [heightSegs=1]
 * @param {number} [depthSegs=1]
 * @returns {Mesh}
 */
export function createCube(width = 1, height = 1, depth = 1, widthSegs = 1, heightSegs = 1, depthSegs = 1) {
  const hw = width / 2, hh = height / 2, hd = depth / 2
  const verts = { pos: [], nrm: [], uv: [] }
  const indices = []

  // +X face
  buildPlaneFace(verts, indices,
    [hw, -hh, hd],  [0, 0, -depth], [0, -height, 0], [1, 0, 0], widthSegs, heightSegs)
  // -X face
  buildPlaneFace(verts, indices,
    [-hw, -hh, -hd], [0, 0, depth],  [0, -height, 0], [-1, 0, 0], widthSegs, heightSegs)
  // +Y face
  buildPlaneFace(verts, indices,
    [-hw, hh, hd],  [width, 0, 0],   [0, 0, -depth], [0, 1, 0], widthSegs, depthSegs)
  // -Y face
  buildPlaneFace(verts, indices,
    [-hw, -hh, -hd], [width, 0, 0],  [0, 0, depth],  [0, -1, 0], widthSegs, depthSegs)
  // +Z face
  buildPlaneFace(verts, indices,
    [-hw, -hh, hd], [width, 0, 0],   [0, -height, 0], [0, 0, 1], widthSegs, heightSegs)
  // -Z face
  buildPlaneFace(verts, indices,
    [hw, -hh, -hd],  [-width, 0, 0], [0, -height, 0], [0, 0, -1], widthSegs, heightSegs)

  return buildMesh(verts, indices)
}

function buildPlaneFace(verts, indices, origin, uDir, vDir, normal, segsU, segsV) {
  const baseIdx = verts.pos.length / 3
  const [ox, oy, oz] = origin
  const [ux, uy, uz] = uDir
  const [vx, vy, vz] = vDir
  const [nx, ny, nz] = normal

  for (let j = 0; j <= segsV; j++) {
    const tv = j / segsV
    for (let i = 0; i <= segsU; i++) {
      const tu = i / segsU
      const px = ox + ux * tu + vx * tv
      const py = oy + uy * tu + vy * tv
      const pz = oz + uz * tu + vz * tv
      pushVertex(verts, px, py, pz, nx, ny, nz, tu, 1 - tv)
    }
  }

  for (let j = 0; j < segsV; j++) {
    for (let i = 0; i < segsU; i++) {
      const a = baseIdx + j * (segsU + 1) + i
      const b = a + segsU + 1
      const c = a + 1
      const d = b + 1
      indices.push(a, b, c)
      indices.push(c, b, d)
    }
  }
}

// --- UV Sphere ---

/**
 * Create a UV sphere centered at origin.
 * Uses longitude/latitude rings like a globe.
 *
 * @param {number} [radius=0.5]
 * @param {number} [segments=32] — longitude segments
 * @param {number} [rings=16] — latitude rings
 * @returns {Mesh}
 */
export function createSphere(radius = 0.5, segments = 32, rings = 16) {
  const verts = { pos: [], nrm: [], uv: [] }
  const indices = []

  // Top vertex (north pole)
  pushVertex(verts, 0, radius, 0, 0, 1, 0, 0.5, 0)

  for (let j = 1; j < rings; j++) {
    const phi = Math.PI * j / rings  // 0 (north) to PI (south)
    const y = Math.cos(phi) * radius
    const r = Math.sin(phi) * radius
    const v = j / rings

    for (let i = 0; i <= segments; i++) {
      const theta = 2 * Math.PI * i / segments
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      const len = Math.sqrt(x * x + y * y + z * z)
      const u = i / segments
      pushVertex(verts, x, y, z, x / len, y / len, z / len, u, v)
    }
  }

  // Bottom vertex (south pole)
  pushVertex(verts, 0, -radius, 0, 0, -1, 0, 0.5, 1)

  const segP1 = segments + 1

  // Top cap
  for (let i = 0; i < segments; i++) {
    indices.push(0, 1 + i, 1 + i + 1)
  }

  // Middle rings
  for (let j = 0; j < rings - 2; j++) {
    const rowStart = 1 + j * segP1
    const nextRow = rowStart + segP1
    for (let i = 0; i < segments; i++) {
      const a = rowStart + i
      const b = nextRow + i
      const c = rowStart + i + 1
      const d = nextRow + i + 1
      indices.push(a, b, c)
      indices.push(c, b, d)
    }
  }

  // Bottom cap
  const last = verts.pos.length / 3 - 1
  const bottomRowStart = 1 + (rings - 2) * segP1
  for (let i = 0; i < segments; i++) {
    indices.push(last, bottomRowStart + i + 1, bottomRowStart + i)
  }

  return buildMesh(verts, indices)
}

// --- Plane ---

/**
 * Create a flat plane on the XZ plane (facing +Y).
 *
 * @param {number} [width=1]
 * @param {number} [depth=1]
 * @param {number} [widthSegs=1]
 * @param {number} [depthSegs=1]
 * @returns {Mesh}
 */
export function createPlane(width = 1, depth = 1, widthSegs = 1, depthSegs = 1) {
  const hw = width / 2, hd = depth / 2
  const verts = { pos: [], nrm: [], uv: [] }
  const indices = []

  for (let j = 0; j <= depthSegs; j++) {
    const z = hd - (depth * j / depthSegs)
    const v = j / depthSegs
    for (let i = 0; i <= widthSegs; i++) {
      const x = -hw + width * i / widthSegs
      const u = i / widthSegs
      pushVertex(verts, x, 0, z, 0, 1, 0, u, v)
    }
  }

  for (let j = 0; j < depthSegs; j++) {
    for (let i = 0; i < widthSegs; i++) {
      const a = j * (widthSegs + 1) + i
      const b = a + widthSegs + 1
      const c = a + 1
      const d = b + 1
      indices.push(a, b, c)
      indices.push(c, b, d)
    }
  }

  return buildMesh(verts, indices)
}

// --- Cylinder ---

/**
 * Create a cylinder centered at origin, along the Y axis.
 *
 * @param {number} [radiusTop=0.5]
 * @param {number} [radiusBottom=0.5]
 * @param {number} [height=1]
 * @param {number} [segments=32]
 * @param {number} [heightSegs=1]
 * @param {boolean} [capTop=true]
 * @param {boolean} [capBottom=true]
 * @returns {Mesh}
 */
export function createCylinder(radiusTop = 0.5, radiusBottom = 0.5, height = 1,
  segments = 32, heightSegs = 1, capTop = true, capBottom = true) {
  const hh = height / 2
  const verts = { pos: [], nrm: [], uv: [] }
  const indices = []

  const slope = (radiusBottom - radiusTop) / height
  const len = Math.sqrt(slope * slope + 1)

  // Side vertices
  for (let j = 0; j <= heightSegs; j++) {
    const y = hh - (height * j / heightSegs)
    const r = radiusTop + (radiusBottom - radiusTop) * (j / heightSegs)
    const v = j / heightSegs

    for (let i = 0; i <= segments; i++) {
      const theta = 2 * Math.PI * i / segments
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      // Normal direction points outward along the slope
      const nx = Math.cos(theta) / len
      const ny = slope / len
      const nz = Math.sin(theta) / len
      const u = i / segments
      pushVertex(verts, x, y, z, nx, ny, nz, u, v)
    }
  }

  const segP1 = segments + 1
  for (let j = 0; j < heightSegs; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * segP1 + i
      const b = a + segP1
      const c = a + 1
      const d = b + 1
      indices.push(a, b, c)
      indices.push(c, b, d)
    }
  }

  // Caps
  if (capTop || capBottom) {
    const sideStart = verts.pos.length / 3
    buildCap(verts, indices, 0, hh, radiusTop, segments, 1, true)
    if (capBottom) {
      buildCap(verts, indices, sideStart, -hh, radiusBottom, segments, -1, false)
    }
  }

  return buildMesh(verts, indices)
}

function buildCap(verts, indices, sideStart, y, radius, segments, normalY, isTop) {
  // Center vertex
  const centerIdx = verts.pos.length / 3
  pushVertex(verts, 0, y, 0, 0, normalY, 0, 0.5, isTop ? 0 : 1)

  for (let i = 0; i <= segments; i++) {
    const theta = 2 * Math.PI * i / segments
    const x = Math.cos(theta) * radius
    const z = Math.sin(theta) * radius
    const u = (Math.cos(theta) + 1) / 2
    const v = (Math.sin(theta) + 1) / 2
    pushVertex(verts, x, y, z, 0, normalY, 0, u, v)
  }

  for (let i = 0; i < segments; i++) {
    if (isTop) {
      indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + i + 1)
    } else {
      indices.push(centerIdx, centerIdx + 1 + i + 1, centerIdx + 1 + i)
    }
  }
}

// --- Torus ---

/**
 * Create a torus (doughnut) centered at origin, flat on XZ plane.
 *
 * @param {number} [majorRadius=0.5] — distance from center to tube center
 * @param {number} [minorRadius=0.125] — tube radius
 * @param {number} [majorSegs=32] — segments around the ring
 * @param {number} [minorSegs=16] — segments around the tube
 * @returns {Mesh}
 */
export function createTorus(majorRadius = 0.5, minorRadius = 0.125, majorSegs = 32, minorSegs = 16) {
  const verts = { pos: [], nrm: [], uv: [] }
  const indices = []

  for (let j = 0; j <= majorSegs; j++) {
    const phi = 2 * Math.PI * j / majorSegs
    const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi)
    const u = j / majorSegs

    for (let i = 0; i <= minorSegs; i++) {
      const theta = 2 * Math.PI * i / minorSegs
      const cosTheta = Math.cos(theta), sinTheta = Math.sin(theta)
      const v = i / minorSegs

      // Center of tube ring
      const cx = cosPhi * majorRadius
      const cz = sinPhi * majorRadius

      // Point on tube
      const px = cx + cosPhi * cosTheta * minorRadius
      const py = sinTheta * minorRadius
      const pz = cz + sinPhi * cosTheta * minorRadius

      // Normal points outward from tube center
      const nx = cosPhi * cosTheta
      const ny = sinTheta
      const nz = sinPhi * cosTheta

      pushVertex(verts, px, py, pz, nx, ny, nz, u, v)
    }
  }

  const segP1 = minorSegs + 1
  for (let j = 0; j < majorSegs; j++) {
    for (let i = 0; i < minorSegs; i++) {
      const a = j * segP1 + i
      const b = a + segP1
      const c = a + 1
      const d = b + 1
      indices.push(a, b, c)
      indices.push(c, b, d)
    }
  }

  return buildMesh(verts, indices)
}

export default { createCube, createSphere, createPlane, createCylinder, createTorus }
