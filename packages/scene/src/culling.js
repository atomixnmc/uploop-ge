/**
 * Culling — Frustum culling for entities.
 *
 * Tests entities against camera frustum planes. Entities outside the
 * frustum are marked as culled and skipped during rendering.
 *
 * @depends @uploop/math (plane, aabb)
 */

import { plane } from '@uploop/math'

/**
 * Frustum cull entities against a camera.
 *
 * @param {Entity[]} entities — all entities to test
 * @param {Camera} camera — camera with frustumPlanes computed
 * @returns {{ visible: Entity[], culled: Entity[] }}
 */
export function frustumCull(entities, camera) {
  if (!camera || !camera.frustumPlanes) {
    return { visible: entities, culled: [] }
  }

  const visible = []
  const culled = []
  const planes = camera.frustumPlanes

  for (const entity of entities) {
    if (!entity.visible) {
      culled.push(entity)
      continue
    }

    // Use a bounding sphere at the entity's world position
    const pos = entity.transform.worldPosition
    const radius = entity.getComponent('boundingRadius') || 1

    if (_isInFrustum(pos, radius, planes)) {
      visible.push(entity)
    } else {
      culled.push(entity)
    }
  }

  return { visible, culled }
}

/** Check if a bounding sphere is inside all frustum planes */
function _isInFrustum(center, radius, planes) {
  for (const p of planes) {
    const d = plane.distanceToPoint(p, center)
    if (d < -radius) return false // Outside this plane
  }
  return true
}

/**
 * Simple distance-based culling (LOD fallback).
 */
export function distanceCull(entities, camera, maxDistance) {
  const camPos = camera.transform.worldPosition
  const maxDist2 = maxDistance * maxDistance

  return entities.filter(e => {
    if (!e.visible) return false
    const pos = e.transform.worldPosition
    const dx = pos[0] - camPos[0]
    const dy = pos[1] - camPos[1]
    const dz = pos[2] - camPos[2]
    return (dx * dx + dy * dy + dz * dz) <= maxDist2
  })
}

export default { frustumCull, distanceCull }
