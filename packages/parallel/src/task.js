/**
 * Task — Compute unit that flows through the scheduler → workers.
 *
 * Tasks are HyperGraph state nodes. Their status transitions:
 *   queued → running → done | error
 *
 * @depends types.js
 */
let _nextTaskId = 0

/**
 * Create a task descriptor.
 * @param {Object} opts
 * @param {string} opts.name
 * @param {Function} opts.fn — Worker-side function (serialized or pre-registered handler name)
 * @param {*} [opts.input] — data passed to fn
 * @param {number} [opts.priority=0] — lower = higher priority
 * @param {AbortSignal} [opts.signal]
 * @returns {import('./types.js').Task}
 */
export function createTask({ name, fn, input, priority = 0, signal } = {}) {
  const id = `task_${++_nextTaskId}`
  return {
    id,
    name,
    fn,
    input,
    priority,
    signal,
    status: 'queued',
    output: undefined,
    error: null,
    createdAt: performance.now(),
    startedAt: null,
    completedAt: null,
  }
}

/**
 * Create a batch of tasks (e.g., partition particle data).
 * Each task gets a slice of the shared input.
 * @param {Object} opts
 * @param {string} opts.name — base name, suffixed with _0, _1, etc.
 * @param {Function} opts.fn
 * @param {ArrayBuffer|TypedArray} opts.data — partitioned across tasks
 * @param {number} opts.partitions — number of tasks
 * @param {number} [opts.priority=0]
 * @returns {import('./types.js').Task[]}
 */
export function createTaskBatch({ name, fn, data, partitions, priority = 0 }) {
  const tasks = []
  const totalSize = data.byteLength || data.length
  const chunkSize = Math.ceil(totalSize / partitions)
  const src = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)

  for (let i = 0; i < partitions; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, totalSize)
    const chunk = src.slice(start, end).buffer // creates new ArrayBuffer (transferable)
    tasks.push(createTask({
      name: `${name}_${i}`,
      fn,
      input: { chunk, offset: start, index: i, totalPartitions: partitions },
      priority,
    }))
  }

  return tasks
}

export default { createTask, createTaskBatch }
