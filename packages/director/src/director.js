/**
 * Director — Orchestrates camera behaviors, object movements, and constraints.
 *
 * The Director is a HyperGraph component. It accepts a timeline of behaviors,
 * evaluates them each frame (via game loop tick), and outputs camera position,
 * target, up, and FOV.
 *
 * @depends types.js, behaviors.js, constraints.js, easing.js, timeline.js, @uploop/math
 */
import { vec3, mat4 } from '@uploop/math'
import { EASING, ease } from './easing.js'
import { applyConstraints } from './constraints.js'

/**
 * @param {Object} [opts]
 * @param {Float32Array|number[]} [opts.position=[0,2,5]]
 * @param {Float32Array|number[]} [opts.target=[0,0,0]]
 * @param {Float32Array|number[]} [opts.up=[0,1,0]]
 * @param {number} [opts.fov=Math.PI/4]
 * @returns {Director}
 */
export function createDirector({
  position = [0, 2, 5],
  target = [0, 0, 0],
  up = [0, 1, 0],
  fov = Math.PI / 4,
} = {}) {
  /** @type {import('./types.js').Behavior[]} */
  const queue = []
  /** @type {import('./types.js').Constraint[]} */
  const _constraints = []
  const subscribers = []

  const state = {
    cameraPosition: vec3.set(vec3.create(), ...position),
    cameraTarget: vec3.set(vec3.create(), ...target),
    cameraUp: vec3.set(vec3.create(), ...up),
    fov,
    active: null,
  }

  let _disposed = false

  function notify() {
    for (const sub of subscribers) sub({ ...state })
  }

  /**
   * Evaluate current behavior with elapsed time.
   * @param {import('./types.js').Behavior} behavior
   * @param {number} dt — delta time in seconds
   */
  function evaluateBehavior(behavior, dt) {
    behavior.elapsed += dt
    behavior.progress = Math.min(1, behavior.elapsed / behavior.duration)
    const t = ease(behavior.easing, behavior.progress)

    switch (behavior.type) {
      case 'dolly': {
        const { from, to } = behavior.params
        vec3.lerp(state.cameraPosition, from, to, t)
        break
      }

      case 'orbit': {
        const { target: orbitTarget, radius, speed, pitch } = behavior.params
        const angle = behavior.params.startAngle + behavior.elapsed * speed * 2 * Math.PI
        behavior.params._angle = angle
        state.cameraPosition[0] = orbitTarget[0] + Math.cos(angle) * Math.cos(pitch) * radius
        state.cameraPosition[1] = orbitTarget[1] + Math.sin(pitch) * radius
        state.cameraPosition[2] = orbitTarget[2] + Math.sin(angle) * Math.cos(pitch) * radius
        vec3.copy(state.cameraTarget, orbitTarget)
        break
      }

      case 'track': {
        const { path, closed } = behavior.params
        if (path.length < 2) break
        const totalSegments = closed ? path.length : path.length - 1
        const segFloat = t * totalSegments
        const segIdx = Math.min(Math.floor(segFloat), path.length - 2)
        const segT = segFloat - segIdx

        const p0 = path[Math.max(0, segIdx - 1)]
        const p1 = path[segIdx]
        const p2 = path[Math.min(path.length - 1, segIdx + 1)]
        const p3 = path[Math.min(path.length - 1, segIdx + 2)]

        // Catmull-Rom spline interpolation
        const t2 = segT * segT
        const t3 = t2 * segT
        state.cameraPosition[0] = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * segT + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
        state.cameraPosition[1] = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * segT + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        state.cameraPosition[2] = 0.5 * ((2 * p1[2]) + (-p0[2] + p2[2]) * segT + (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 + (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3)

        // Look ahead for target
        if (segIdx < path.length - 1) {
          vec3.copy(state.cameraTarget, path[Math.min(segIdx + 1, path.length - 1)])
        }
        break
      }

      case 'pan': {
        const { yaw, pitch: panPitch, startYaw, startPitch } = behavior.params
        const currentYaw = startYaw + yaw * t
        const currentPitch = startPitch + panPitch * t
        const dir = vec3.create()
        dir[0] = Math.cos(currentPitch) * Math.sin(currentYaw)
        dir[1] = Math.sin(currentPitch)
        dir[2] = Math.cos(currentPitch) * Math.cos(currentYaw)
        vec3.add(state.cameraTarget, state.cameraPosition, dir)
        break
      }

      case 'crane': {
        const { base, height: craneHeight, swing } = behavior.params
        state.cameraPosition[0] = base[0] + Math.sin(swing * t) * 2
        state.cameraPosition[1] = base[1] + craneHeight * t
        state.cameraPosition[2] = base[2] + Math.cos(swing * t) * 2
        vec3.copy(state.cameraTarget, base)
        break
      }

      case 'zoom': {
        state.fov = behavior.params.from + (behavior.params.to - behavior.params.from) * t
        break
      }

      case 'wait':
        break
    }

    // Apply constraints
    applyConstraints(state.cameraPosition, _constraints)

    // Apply lookAt constraints
    for (const c of _constraints) {
      if (c.type === 'lookAt') {
        vec3.lerp(state.cameraTarget, state.cameraTarget, c.params.target, c.params.weight * t)
      }
    }
  }

  /** @type {Director} */
  const director = {
    get position() { return state.cameraPosition },
    get target() { return state.cameraTarget },
    get up() { return state.cameraUp },
    get fov() { return state.fov },
    get active() { return state.active },

    /** Play a timeline (replaces any running) */
    play(tl) {
      queue.length = 0
      for (const b of tl.behaviors) {
        queue.push({ ...b, elapsed: 0, progress: 0, status: 'waiting' })
      }
      if (queue.length > 0) {
        queue[0].status = 'running'
        state.active = queue[0]
      }
      state._timeline = tl
      notify()
    },

    /** Queue a single behavior */
    queueBehavior(behavior) {
      queue.push({ ...behavior, elapsed: 0, progress: 0, status: 'waiting' })
    },

    /** Add a constraint */
    addConstraint(constraint) {
      _constraints.push(constraint)
    },

    /** Remove a constraint by type */
    removeConstraint(type) {
      const i = _constraints.findIndex(c => c.type === type)
      if (i >= 0) _constraints.splice(i, 1)
    },

    /** Clear all constraints */
    clearConstraints() {
      _constraints.length = 0
    },

    /** Update: call each frame with delta time */
    update(dt) {
      if (_disposed || queue.length === 0) return

      const current = queue[0]
      if (current.status === 'done') {
        queue.shift()
        if (queue.length > 0) {
          queue[0].status = 'running'
          state.active = queue[0]
        } else if (state._timeline?.loop) {
          // Re-queue timeline behaviors for looping
          for (const b of state._timeline.behaviors) {
            queue.push({ ...b, elapsed: 0, progress: 0, status: 'waiting' })
          }
          if (queue.length > 0) {
            queue[0].status = 'running'
            state.active = queue[0]
          }
        } else {
          state.active = null
        }
        notify()
        return
      }

      evaluateBehavior(current, dt)

      if (current.progress >= 1) {
        current.status = 'done'
      }

      notify()
    },

    /** Skip to next behavior in timeline */
    skip() {
      if (queue.length > 0) {
        queue[0].status = 'done'
      }
    },

    /** Get current state */
    getState() {
      return { ...state, queueLength: queue.length, constraintsCount: _constraints.length }
    },

    /** Subscribe to state changes */
    subscribe(fn) {
      subscribers.push(fn)
      fn(this.getState())
      return () => {
        const i = subscribers.indexOf(fn)
        if (i >= 0) subscribers.splice(i, 1)
      }
    },

    /** Reset */
    reset() {
      queue.length = 0
      vec3.set(state.cameraPosition, ...position)
      vec3.set(state.cameraTarget, ...target)
      vec3.set(state.cameraUp, ...up)
      state.fov = fov
      state.active = null
      notify()
    },

    /** Dispose */
    dispose() {
      _disposed = true
      queue.length = 0
    },

    /** HyperGraph manifest */
    describe() {
      return {
        kind: 'uploop.director',
        name: 'Director',
        nodes: [
          { id: 'director.position', kind: 'Vec3', value: Array.from(state.cameraPosition) },
          { id: 'director.target', kind: 'Vec3', value: Array.from(state.cameraTarget) },
          { id: 'director.fov', kind: 'number', value: state.fov },
          { id: 'director.active', kind: 'behavior', value: state.active?.type || 'idle' },
          { id: 'director.queue', kind: 'queue', value: queue.length },
          ..._constraints.map((c, i) => ({ id: `director.constraint_${i}`, kind: 'constraint', value: c.type })),
        ],
        edges: [
          { from: 'director.position', to: 'director.target', kind: 'looks-at' },
          ..._constraints.map((c, i) => ({ from: `director.constraint_${i}`, to: 'director.position', kind: 'constrains' })),
        ],
      }
    },
  }

  return director
}

export default { createDirector }
