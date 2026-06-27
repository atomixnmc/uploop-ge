/**
 * Sorting — Sort entities for correct rendering order.
 *
 * Provides painter's algorithm (back-to-front for transparents),
 * front-to-back (for opaque, to minimize overdraw), and material
 * grouping to reduce state changes.
 */

/**
 * Sort entities by material ID (reduce state changes).
 * Entities with the same material are rendered together.
 */
export function sortByMaterial(entities) {
  return [...entities].sort((a, b) => {
    const ma = a.materialId || ''
    const mb = b.materialId || ''
    return ma.localeCompare(mb)
  })
}

/**
 * Painter's algorithm — sort back-to-front by distance from camera.
 * Used for transparent objects.
 */
export function sortBackToFront(entities, cameraPos) {
  return [...entities].sort((a, b) => {
    const aPos = a.transform.worldPosition
    const bPos = b.transform.worldPosition
    const aDist = _dist2(aPos, cameraPos)
    const bDist = _dist2(bPos, cameraPos)
    return bDist - aDist // descending = back to front
  })
}

/**
 * Sort front-to-back by distance from camera.
 * Used for opaque objects (minimize overdraw).
 */
export function sortFrontToBack(entities, cameraPos) {
  return [...entities].sort((a, b) => {
    const aDist = _dist2(a.transform.worldPosition, cameraPos)
    const bDist = _dist2(b.transform.worldPosition, cameraPos)
    return aDist - bDist // ascending = front to back
  })
}

/**
 * Group entities by material, then sort groups front-to-back.
 * Optimal for opaque rendering: minimize state changes first,
 * then minimize overdraw within each group.
 */
export function sortByMaterialThenFrontToBack(entities, cameraPos) {
  const groups = new Map()
  for (const e of entities) {
    const key = e.materialId || '__default__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }
  // Sort each group front-to-back
  for (const group of groups.values()) {
    group.sort((a, b) => {
      return _dist2(a.transform.worldPosition, cameraPos) -
             _dist2(b.transform.worldPosition, cameraPos)
    })
  }
  // Flatten
  const result = []
  for (const group of groups.values()) {
    for (const e of group) result.push(e)
  }
  return result
}

/** Split entities into opaque and transparent sets */
export function splitOpaqueTransparent(entities) {
  const opaque = []
  const transparent = []
  for (const e of entities) {
    // Check for transparency flag or material with alpha < 1
    if (e.getComponent('transparent') || e.getComponent('alpha') < 1) {
      transparent.push(e)
    } else {
      opaque.push(e)
    }
  }
  return { opaque, transparent }
}

function _dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2]
  return dx * dx + dy * dy + dz * dz
}

export default { sortByMaterial, sortBackToFront, sortFrontToBack,
  sortByMaterialThenFrontToBack, splitOpaqueTransparent }
