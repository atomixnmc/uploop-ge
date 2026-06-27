/**
 * @uploop/director — Cinematic camera flows, object movement, constraints.
 *
 * The Director is a HyperGraph component that orchestrates camera behaviors
 * through timelines with easing, constraints, and transitions.
 *
 * Usage:
 *   import { createDirector, dolly, orbit, lookAt, timeline } from '@uploop/director'
 *
 *   const director = createDirector({ position: [0,2,5], target: [0,0,0] })
 *   director.addConstraint(lookAt([0,1,0]))
 *   director.play(timeline([dolly({...}), orbit({...})]))
 *
 *   // In game loop:
 *   director.update(dt)
 *   const { cameraPosition, cameraTarget, fov } = director.getState()
 */

export { createDirector } from './director.js'
export { dolly, orbit, track, pan, crane, zoom } from './behaviors.js'
export { lookAt, bounds, distance, applyConstraints } from './constraints.js'
export { timeline, parallel, wait } from './timeline.js'
export { EASING, ease } from './easing.js'
