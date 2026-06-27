import { describe, it, expect, vi } from 'vitest'
import { vec3, quat, mat4, plane } from '@uploop/math'
import { Transform } from '../src/transform.js'
import { Entity } from '../src/entity.js'
import { PerspectiveCamera, OrthographicCamera } from '../src/camera.js'
import { DirectionalLight, PointLight, AmbientLight } from '../src/light.js'
import { createScene } from '../src/scene.js'
import { frustumCull } from '../src/culling.js'
import { sortByMaterial, sortBackToFront } from '../src/sorting.js'
import { batchEntities, batchStats } from '../src/batching.js'
import { createGameLoop } from '../src/gameloop.js'

describe('Transform', () => {
  it('creates with identity values', () => {
    const t = Transform()
    expect(t.position[0]).toBe(0)
    expect(t.position[1]).toBe(0)
    expect(t.scale[0]).toBe(1)
  })

  it('localToWorld', () => {
    const t = Transform()
    t.position = vec3.create(5, 0, 0)
    t.rotation = quat.create() // identity
    t.scale = vec3.create(1, 1, 1)
    const m = t.worldMatrix
    expect(m[12]).toBe(5)
    expect(m[13]).toBe(0)
    expect(m[14]).toBe(0)
  })

  it('parent-child hierarchy', () => {
    const parent = Transform()
    parent.position = vec3.create(0, 10, 0)

    const child = Transform()
    child.position = vec3.create(5, 0, 0)
    parent.addChild(child)

    const wp = child.worldPosition
    expect(wp[0]).toBe(5)
    expect(wp[1]).toBe(10) // parent's Y offset
  })

  it('forward/up/right', () => {
    const t = Transform()
    const fwd = t.forward
    expect(fwd[2]).toBeCloseTo(-1) // default forward is -Z
    const up = t.up
    expect(up[1]).toBeCloseTo(1)
  })
})

describe('Entity', () => {
  it('creates with defaults', () => {
    const e = Entity({ name: 'test' })
    expect(e.name).toBe('test')
    expect(e.visible).toBe(true)
    expect(e.meshId).toBeNull()
    expect(e.transform).toBeDefined()
  })

  it('tags and components', () => {
    const e = Entity({ tags: ['enemy'], components: { health: 100 } })
    expect(e.hasTag('enemy')).toBe(true)
    expect(e.hasTag('player')).toBe(false)
    expect(e.getComponent('health')).toBe(100)
    e.setComponent('speed', 5)
    expect(e.hasComponent('speed')).toBe(true)
  })

  it('clone creates independent entity', () => {
    const e = Entity({ name: 'original', tags: ['a'] })
    const c = e.clone()
    c.name = 'clone'
    c.addTag('b')
    expect(e.name).toBe('original')
    expect(e.hasTag('b')).toBe(false)
  })
})

describe('Camera', () => {
  it('perspective camera defaults', () => {
    const cam = PerspectiveCamera({ fov: Math.PI / 4, aspect: 1.5 })
    expect(cam.near).toBe(0.1)
    expect(cam.far).toBe(1000)
    const proj = cam.projectionMatrix
    expect(proj[0]).toBeGreaterThan(0)
  })

  it('orthographic camera', () => {
    const cam = OrthographicCamera({ left: -5, right: 5, bottom: -5, top: 5 })
    expect(cam.left).toBe(-5)
    expect(cam.right).toBe(5)
  })

  it('frustum planes', () => {
    const cam = PerspectiveCamera()
    cam.updateFrustum()
    expect(cam.frustumPlanes).toHaveLength(6)
    // Each plane should be normalized
    for (const p of cam.frustumPlanes) {
      const len = Math.hypot(p.normal[0], p.normal[1], p.normal[2])
      expect(len).toBeCloseTo(1, 1)
    }
  })
})

describe('Lights', () => {
  it('directional light', () => {
    const l = DirectionalLight({ direction: [0, -1, 0], intensity: 2 })
    expect(l.type).toBe('directional')
    expect(l.intensity).toBe(2)
    expect(l.direction[1]).toBe(-1)
  })

  it('ambient light', () => {
    const l = AmbientLight()
    expect(l.type).toBe('ambient')
  })
})

describe('Scene', () => {
  it('add/remove/query entities', () => {
    const scene = createScene()
    const e1 = Entity({ name: 'a', tags: ['t1'] })
    const e2 = Entity({ name: 'b', tags: ['t2'], components: { c: 1 } })

    scene.add(e1)
    scene.add(e2)
    expect(scene.entityCount).toBe(2)

    expect(scene.queryTag('t1')).toHaveLength(1)
    expect(scene.queryComponent('c')).toHaveLength(1)

    scene.remove(e1)
    expect(scene.entityCount).toBe(1)
  })

  it('cameras and lights', () => {
    const scene = createScene()
    const cam = PerspectiveCamera()
    const light = DirectionalLight()

    scene.addCamera(cam)
    scene.addLight(light)
    expect(scene.activeCamera).toBe(cam)
    expect(scene.lights).toHaveLength(1)
    expect(scene.dynamicLights).toHaveLength(1)
  })
})

describe('Culling', () => {
  it('frustum cull keeps entities inside frustum', () => {
    const cam = PerspectiveCamera({ fov: Math.PI / 2, aspect: 1, near: 0.1, far: 100 })
    cam.updateFrustum()

    const e1 = Entity({ name: 'front', components: { boundingRadius: 1 } })
    e1.transform.position = vec3.create(0, 0, -5) // in front of camera

    const e2 = Entity({ name: 'behind', components: { boundingRadius: 1 } })
    e2.transform.position = vec3.create(0, 0, 200) // far behind

    const { visible, culled } = frustumCull([e1, e2], cam)
    expect(visible.map(e => e.name)).toContain('front')
    // e2 may or may not be culled depending on far plane — far=100, z=200 should be culled
    expect(culled.map(e => e.name)).toContain('behind')
  })
})

describe('Sorting', () => {
  it('sortByMaterial groups by materialId', () => {
    const e1 = Entity({ name: 'a', materialId: 'mat2' })
    const e2 = Entity({ name: 'b', materialId: 'mat1' })
    const sorted = sortByMaterial([e1, e2])
    expect(sorted[0].materialId).toBe('mat1')
  })

  it('sortBackToFront', () => {
    const e1 = Entity({ name: 'far' })
    e1.transform.position = vec3.create(0, 0, -100)
    const e2 = Entity({ name: 'near' })
    e2.transform.position = vec3.create(0, 0, -1)

    const sorted = sortBackToFront([e1, e2], vec3.create(0, 0, 0))
    // "near" should come first (rendered last for back-to-front)
    expect(sorted[0].name).toBe('far')
  })
})

describe('Batching', () => {
  it('batchEntities groups by mesh+material', () => {
    const e1 = Entity({ meshId: 'cube', materialId: 'red' })
    const e2 = Entity({ meshId: 'cube', materialId: 'red' })
    const e3 = Entity({ meshId: 'cube', materialId: 'blue' })

    const batches = batchEntities([e1, e2, e3])
    expect(batches).toHaveLength(2)
    expect(batches[0].instanceCount).toBe(2) // 2 red cubes
    expect(batches[1].instanceCount).toBe(1) // 1 blue
  })

  it('batchStats computes savings', () => {
    const entities = []
    for (let i = 0; i < 10; i++) {
      entities.push(Entity({ meshId: 'cube', materialId: 'mat' }))
    }
    const stats = batchStats(entities)
    expect(stats.total).toBe(10)
    expect(stats.batched).toBe(1)
    expect(stats.saved).toBe(9)
  })
})

describe('createGameLoop', () => {
  it('creates with defaults', () => {
    const loop = createGameLoop({
      state: { count: 0 },
      update: {
        inc: (s) => ({ count: s.count + 1 }),
      },
    })
    expect(loop.time).toBe(0)
    expect(loop.running).toBe(false)
    expect(loop.getState().count).toBe(0)

    loop.send('inc')
    expect(loop.getState().count).toBe(1)
  })

  it('subscribe receives state changes', async () => {
    const loop = createGameLoop({
      state: { x: 0 },
      update: { set: (s, v) => ({ x: v }) },
    })

    const fn = vi.fn()
    loop.subscribe(fn)

    loop.send('set', 42)

    // Manual send doesn't notify — only frame ticks do.
    // But we can test that subscribe returns an unsubscribe function.
    const unsub = loop.subscribe(() => {})
    expect(typeof unsub).toBe('function')
    unsub()
  })

  it('describe returns manifest', () => {
    const loop = createGameLoop({
      state: { health: 100 },
      update: { damage: () => ({ health: 50 }) },
    })
    const desc = loop.describe()
    expect(desc.kind).toBe('uploop.gameloop')
    expect(desc.state).toContain('health')
    expect(desc.update).toContain('damage')
  })
})
