/**
 * @uploop/parallel — Parallel execution, task scheduler & Web Worker pool.
 *
 * Every worker, task, and the scheduler itself are HyperGraph nodes.
 * Tasks flow through the graph: queued → running → done/error.
 *
 * Usage:
 *   import { createWorkerPool, createTask, createScheduler } from '@uploop/parallel'
 *
 *   const pool = createWorkerPool({ workers: 4, source: './worker.js' })
 *   const scheduler = createScheduler({ pool })
 *
 *   scheduler.schedule(createTask({ name: 'compute', fn: 'heavyMath', input: data }))
 *   scheduler.subscribe(stats => console.log(stats))
 *   console.log(scheduler.describe())
 */

export { createWorkerPool } from './pool.js'
export { createTask, createTaskBatch } from './task.js'
export { createScheduler } from './scheduler.js'

/**
 * Create a shared buffer for zero-copy transfer between main thread and workers.
 * Uses SharedArrayBuffer for coordinated access.
 *
 * @param {number} byteLength
 * @returns {SharedArrayBuffer}
 */
export function createSharedBuffer(byteLength) {
  return new SharedArrayBuffer(byteLength)
}

/**
 * Generate a worker script that processes tasks via a handler registry.
 * For inline workers (no separate file needed).
 *
 * @param {Record<string, Function>} handlers — name → fn map
 * @returns {string} worker source code
 */
export function createWorkerSource(handlers) {
  const handlerMap = {}
  for (const [name, fn] of Object.entries(handlers)) {
    handlerMap[name] = fn.toString()
  }
  return `
const handlers = {
${Object.entries(handlerMap).map(([k, v]) => `  ${JSON.stringify(k)}: ${v}`).join(',\n')}
}

self.onmessage = async (e) => {
  const { taskId, data } = e.data
  try {
    const handlerName = typeof data === 'object' && data._handler ? data._handler : Object.keys(handlers)[0]
    const fn = handlers[handlerName]
    if (!fn) throw new Error('Unknown handler: ' + handlerName)
    const result = await fn(typeof data === 'object' && data._payload !== undefined ? data._payload : data)
    self.postMessage({ taskId, result })
  } catch (error) {
    self.postMessage({ taskId, error: error.message })
  }
}
`
}
