import { describe, it, expect } from 'vitest'
import { VertexFormat, Formats, Mesh, createCube, createSphere, createPlane, createCylinder, createTorus, interleave, vertexCount, computeFlatNormals, buildBVH, rayQuery, nodeCount } from '../src/index.js'
import { ray, vec3 } from '@uploop/math'

describe('VertexFormat', () => {
  it('PNU has position, normal, uv', () => {
    const fmt = Formats.PNU
    expect(fmt.has('position')).toBe(true)
    expect(fmt.has('normal')).toBe(true)
    expect(fmt.has('uv')).toBe(true)
    expect(fmt.has('tangent')).toBe(false)
    expect(fmt.stride).toBe(12 + 12 + 8) // 32 bytes
  })

  it('custom format with overrides', () => {
    const fmt = VertexFormat(['position', 'color'], {
      color: { type: 'uint8', count: 4 }
    })
    expect(fmt.layout.color.type).toBe('uint8')
    expect(fmt.layout.color.byteSize).toBe(1)
  })

  it('offsetOf', () => {
    const fmt = Formats.PNU
    expect(fmt.offsetOf('position')).toBe(0)
    expect(fmt.offsetOf('normal')).toBe(12)
    expect(fmt.offsetOf('uv')).toBe(24)
  })
})

describe('primitives', () => {
  it('createCube returns valid mesh', () => {
    const cube = createCube(2, 2, 2)
    expect(cube.vertexCount).toBeGreaterThan(0)
    expect(cube.indexCount).toBeGreaterThan(0)
    expect(cube.drawMode).toBe('triangles')
    expect(cube.triangleCount).toBe(12) // 6 faces * 2 triangles
    const bbox = cube.computeBBox()
    expect(bbox).not.toBeNull()
    expect(bbox.min[0]).toBeCloseTo(-1)
    expect(bbox.max[0]).toBeCloseTo(1)
  })

  it('createSphere returns valid mesh', () => {
    const sphere = createSphere(1, 16, 8)
    expect(sphere.vertexCount).toBeGreaterThan(0)
    expect(sphere.triangleCount).toBeGreaterThan(0)
    const bbox = sphere.computeBBox()
    expect(bbox.max[1]).toBeCloseTo(1)
    expect(bbox.min[1]).toBeCloseTo(-1)
  })

  it('createPlane returns valid mesh', () => {
    const plane = createPlane(4, 3, 2, 1)
    expect(plane.vertexCount).toBe(6) // (2+1)*(1+1)
    // Normals all point up
    const fmt = plane.format
    const noff = fmt.offsetOf('normal') / 4
    const stride = fmt.stride / 4
    for (let i = 0; i < plane.vertexCount; i++) {
      const ny = plane.vertices[i * stride + noff + 1]
      expect(ny).toBeCloseTo(1)
    }
  })

  it('createCylinder returns valid mesh', () => {
    const cyl = createCylinder(0.5, 0.5, 2, 16, 1, true, true)
    expect(cyl.vertexCount).toBeGreaterThan(0)
    expect(cyl.triangleCount).toBeGreaterThan(0)
  })

  it('createTorus returns valid mesh', () => {
    const torus = createTorus(0.5, 0.125, 16, 8)
    expect(torus.vertexCount).toBeGreaterThan(0)
    expect(torus.triangleCount).toBeGreaterThan(0)
  })
})

describe('buffer utils', () => {
  it('interleave and vertexCount', () => {
    const fmt = Formats.PNU
    // 3 vertices
    const pos = new Float32Array([0,0,0, 1,0,0, 0,1,0])
    const nrm = new Float32Array([0,1,0, 0,1,0, 0,1,0])
    const uv  = new Float32Array([0,0, 1,0, 0,1])
    const buf = interleave(fmt, { position: pos, normal: nrm, uv }, 3)
    expect(buf.length).toBe(3 * (fmt.stride / 4)) // 3 * 8 = 24
    expect(vertexCount(buf, fmt)).toBe(3)
  })

  it('computeFlatNormals', () => {
    // Single triangle
    const pos = new Float32Array([0,0,0, 1,0,0, 0,1,0])
    const idx = new Uint16Array([0,1,2])
    const norms = computeFlatNormals(pos, idx)
    // Normal should be (0, 0, 1) for a triangle on XY plane
    expect(norms[2]).toBeCloseTo(1) // z component
  })
})

describe('BVH', () => {
  it('buildBVH and rayQuery', () => {
    // Simple quad as two triangles
    const pos = new Float32Array([
      -1, 0, -1,   1, 0, -1,   1, 0, 1,   -1, 0, 1
    ])
    const idx = new Uint16Array([0,1,2, 0,2,3])
    const bvh = buildBVH(pos, idx)
    expect(nodeCount(bvh)).toBeGreaterThan(0)

    // Ray from above, pointing down
    const r = ray.createRay(vec3.create(0, 5, 0), vec3.create(0, -1, 0))
    const hits = rayQuery(bvh, r, pos, idx)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].distance).toBeCloseTo(5)
  })

  it('ray miss', () => {
    const pos = new Float32Array([-1,0,-1, 1,0,-1, 1,0,1, -1,0,1])
    const idx = new Uint16Array([0,1,2, 0,2,3])
    const bvh = buildBVH(pos, idx)
    // Ray pointing sideways, parallel to plane
    const r2 = ray.createRay(vec3.create(0, 5, 0), vec3.create(1, 0, 0))
    const hits2 = rayQuery(bvh, r2, pos, idx)
    expect(hits2.length).toBe(0)
  })
})

describe('Mesh', () => {
  it('clone creates independent copy', () => {
    const cube = createCube(1, 1, 1)
    const clone = cube.clone()
    expect(clone.vertexCount).toBe(cube.vertexCount)
    expect(clone.vertices).not.toBe(cube.vertices) // different buffer
    clone.vertices[0] = 999
    expect(cube.vertices[0]).not.toBe(999) // independent
  })
})
