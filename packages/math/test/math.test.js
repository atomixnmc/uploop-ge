import { describe, it, expect } from 'vitest'
import { vec2, vec3, vec4, mat3, mat4, quat, euler, color, ray, plane, aabb, spline, interpolate } from '../src/index.js'

describe('vec2', () => {
  it('create and basic ops', () => {
    const a = vec2.create(1, 2)
    const b = vec2.create(3, 4)
    expect(a[0]).toBe(1)
    expect(a[1]).toBe(2)

    const out = vec2.create()
    vec2.add(out, a, b)
    expect(out[0]).toBe(4)
    expect(out[1]).toBe(6)

    expect(vec2.length(a)).toBeCloseTo(Math.sqrt(5))
    expect(vec2.dot(a, b)).toBe(11)
  })

  it('normalize', () => {
    const v = vec2.create(3, 4)
    vec2.normalize(v, v)
    expect(v[0]).toBeCloseTo(0.6)
    expect(v[1]).toBeCloseTo(0.8)
    expect(vec2.length(v)).toBeCloseTo(1)
  })

  it('lerp', () => {
    const out = vec2.create()
    vec2.lerp(out, vec2.create(0, 0), vec2.create(10, 10), 0.5)
    expect(out[0]).toBe(5)
    expect(out[1]).toBe(5)
  })
})

describe('vec3', () => {
  it('cross product', () => {
    const a = vec3.create(1, 0, 0)
    const b = vec3.create(0, 1, 0)
    const out = vec3.create()
    vec3.cross(out, a, b)
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(0)
    expect(out[2]).toBe(1)
  })

  it('transformMat4', () => {
    const v = vec3.create(1, 0, 0)
    const m = mat4.create()
    mat4.fromYRotation(m, Math.PI / 2) // 90° around Y
    vec3.transformMat4(v, v, m)
    expect(v[0]).toBeCloseTo(0)
    expect(v[2]).toBeCloseTo(-1)
  })
})

describe('mat4', () => {
  it('identity', () => {
    const m = mat4.create()
    expect(m[0]).toBe(1)
    expect(m[5]).toBe(1)
    expect(m[10]).toBe(1)
    expect(m[15]).toBe(1)
  })

  it('perspective', () => {
    const m = mat4.create()
    mat4.perspective(m, Math.PI / 4, 16 / 9, 0.1, 100)
    expect(m[0]).toBeCloseTo(1.358)
    expect(m[5]).toBeCloseTo(2.414)
    expect(m[10]).toBeCloseTo(-1.002)
    expect(m[11]).toBe(-1)
  })

  it('multiply', () => {
    const a = mat4.create()
    const b = mat4.create()
    mat4.fromTranslation(a, vec3.create(1, 2, 3))
    mat4.fromScaling(b, vec3.create(2, 2, 2))
    const out = mat4.create()
    mat4.multiply(out, a, b)
    // Translation after scale: the scale column gets multiplied
    expect(out[12]).toBe(1)
    expect(out[13]).toBe(2)
    expect(out[14]).toBe(3)
    expect(out[0]).toBe(2)
  })

  it('lookAt', () => {
    const out = mat4.create()
    mat4.lookAt(out,
      vec3.create(0, 0, 5),
      vec3.create(0, 0, 0),
      vec3.create(0, 1, 0))
    // Camera at (0,0,5) looking at (0,0,0): forward = normalized(eye-center) = (0,0,1)
    expect(out[8]).toBeCloseTo(0)
    expect(out[9]).toBeCloseTo(0)
    expect(out[10]).toBeCloseTo(1)
  })

  it('invert', () => {
    const m = mat4.create()
    mat4.fromTranslation(m, vec3.create(5, 0, 0))
    const inv = mat4.create()
    const result = mat4.invert(inv, m)
    expect(result).not.toBeNull()
    expect(inv[12]).toBe(-5)
  })
})

describe('quat', () => {
  it('identity', () => {
    const q = quat.create()
    expect(q[0]).toBe(0)
    expect(q[1]).toBe(0)
    expect(q[2]).toBe(0)
    expect(q[3]).toBe(1)
  })

  it('fromAxisAngle', () => {
    const q = quat.create()
    quat.fromAxisAngle(q, vec3.create(0, 1, 0), Math.PI) // 180° around Y
    expect(q[1]).toBeCloseTo(1)  // sin(pi/2) = 1
    expect(q[3]).toBeCloseTo(0)  // cos(pi/2) = 0
  })

  it('slerp', () => {
    const a = quat.create() // identity
    const b = quat.create()
    quat.fromAxisAngle(b, vec3.create(0, 1, 0), Math.PI / 2)
    const out = quat.create()
    quat.slerp(out, a, b, 0.5)
    // Should be halfway
    expect(quat.length(out)).toBeCloseTo(1)
  })
})

describe('color', () => {
  it('fromHex', () => {
    const c = color.fromHex('#ff0000')
    expect(c[0]).toBe(1)
    expect(c[1]).toBe(0)
    expect(c[2]).toBe(0)
    expect(c[3]).toBe(1)
  })

  it('toHex', () => {
    expect(color.toHex(color.create(1, 0.5, 0.25))).toBe('#ff8040')
  })

  it('luminance', () => {
    expect(color.luminance(color.create(1, 1, 1))).toBeCloseTo(1)
    expect(color.luminance(color.create(0, 0, 0))).toBe(0)
  })
})

describe('ray', () => {
  it('intersectPlane', () => {
    const r = ray.createRay(vec3.create(0, 0, 5), vec3.create(0, 0, -1))
    const p = plane.createPlane(vec3.create(0, 0, 1), 0) // z=0 plane, facing +z
    const t = ray.intersectPlane(r, p)
    expect(t).toBe(5)
  })

  it('intersectSphere', () => {
    const r = ray.createRay(vec3.create(0, 0, 5), vec3.create(0, 0, -1))
    const t = ray.intersectSphere(r, vec3.create(0, 0, 0), 1)
    expect(t).toBe(4) // hits at z=1
  })
})

describe('aabb', () => {
  it('fromPoints', () => {
    const box = aabb.createAABB()
    aabb.fromPoints(box, [
      vec3.create(-1, -2, -3),
      vec3.create(1, 2, 3),
    ])
    expect(box.min[0]).toBe(-1)
    expect(box.max[1]).toBe(2)
  })

  it('intersects', () => {
    const a = aabb.createAABB(vec3.create(0, 0, 0), vec3.create(1, 1, 1))
    const b = aabb.createAABB(vec3.create(0.5, 0.5, 0.5), vec3.create(2, 2, 2))
    expect(aabb.intersects(a, b)).toBe(true)
  })

  it('volume', () => {
    const box = aabb.createAABB(vec3.create(0, 0, 0), vec3.create(2, 3, 4))
    expect(aabb.volume(box)).toBe(24)
  })
})

describe('interpolate', () => {
  it('lerp', () => {
    expect(interpolate.lerp(0, 10, 0.5)).toBe(5)
  })

  it('smoothstep', () => {
    expect(interpolate.smoothstep(0.5)).toBe(0.5)
    expect(interpolate.smoothstep(0)).toBe(0)
    expect(interpolate.smoothstep(1)).toBe(1)
  })

  it('easing functions return valid range', () => {
    const fns = [
      interpolate.easeInQuad, interpolate.easeOutQuad, interpolate.easeInOutQuad,
      interpolate.easeInCubic, interpolate.easeInOutBack, interpolate.easeOutElastic,
    ]
    for (const fn of fns) {
      expect(fn(0)).toBeCloseTo(0)
      expect(fn(1)).toBeCloseTo(1)
    }
  })
})

describe('spline', () => {
  it('cubic bezier', () => {
    expect(spline.cubic(0, 0.5, 0.5, 1, 0.5)).toBe(0.5)
    expect(spline.cubic(0, 0, 1, 1, 0)).toBe(0)
    expect(spline.cubic(0, 0, 1, 1, 1)).toBe(1)
  })
})
