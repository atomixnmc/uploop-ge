/**
 * Batching — Instance batching and draw-call deduplication.
 *
 * Groups entities with the same mesh + material into instanced draw calls.
 * Reduces draw calls from O(N) to O(unique mesh+material combos).
 */

/**
 * Batch entities into draw groups.
 *
 * Each group has the same meshId + materialId and can be drawn
 * with a single instanced draw call.
 *
 * @param {Entity[]} entities
 * @returns {DrawBatch[]}
 */
export function batchEntities(entities) {
  const batches = new Map()

  for (const entity of entities) {
    if (!entity.visible) continue
    if (!entity.meshId) continue

    const key = `${entity.meshId}::${entity.materialId || 'default'}`
    if (!batches.has(key)) {
      batches.set(key, {
        meshId: entity.meshId,
        materialId: entity.materialId || 'default',
        entities: [],
        instanceCount: 0,
        transforms: [], // per-instance model matrices
      })
    }

    const batch = batches.get(key)
    batch.entities.push(entity)
    batch.transforms.push(entity.transform.worldMatrix)
    batch.instanceCount = batch.entities.length
  }

  return [...batches.values()]
}

/**
 * Calculate draw-call stats.
 *
 * @param {Entity[]} entities
 * @returns {{ total: number, batched: number, saved: number, savingsPercent: number }}
 */
export function batchStats(entities) {
  const total = entities.filter(e => e.visible && e.meshId).length
  const batches = batchEntities(entities)
  const batched = batches.length
  const saved = total - batched
  return {
    total,
    batched,
    saved,
    savingsPercent: total > 0 ? Math.round((saved / total) * 100) : 0,
  }
}

/**
 * Generate a flat Float32Array of all instance model matrices.
 * Ready for upload to an instanced vertex buffer.
 *
 * @param {DrawBatch} batch
 * @returns {Float32Array} — flat array of 4×4 matrices (16 floats each)
 */
export function instanceMatrixData(batch) {
  const count = batch.instanceCount
  const data = new Float32Array(count * 16)
  for (let i = 0; i < count; i++) {
    data.set(batch.transforms[i], i * 16)
  }
  return data
}

export default { batchEntities, batchStats, instanceMatrixData }
