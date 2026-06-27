/**
 * WorkerPool — Manages a pool of Web Workers.
 *
 * Each worker is a HyperGraph node. Tasks flow through workers as data edges.
 * Workers report completion, errors, and stats back to the scheduler.
 *
 * @depends types.js
 */
let _nextPoolId = 0

/**
 * Create a pool of Web Workers.
 * @param {import('./types.js').PoolConfig} config
 * @returns {WorkerPool}
 */
export function createWorkerPool({ workers = 4, source, type = 'module' } = {}) {
  const id = ++_nextPoolId
  /** @type {import('./types.js').WorkerInfo[]} */
  const workerList = []
  const handlers = new Map() // taskId → { resolve, reject }

  // Spawn workers
  for (let i = 0; i < workers; i++) {
    const worker = new Worker(source, { type })
    const info = { id: i, worker, status: 'idle', taskId: null, tasksCompleted: 0 }

    worker.onmessage = (e) => {
      const { taskId, result, error } = e.data
      const handler = handlers.get(taskId)
      if (!handler) return

      handlers.delete(taskId)
      info.status = 'idle'
      info.taskId = null
      info.tasksCompleted++

      if (error) {
        handler.reject(new Error(error))
      } else {
        handler.resolve(result)
      }

      // Notify pool subscriber
      if (_onChange) _onChange(getPoolState())
    }

    worker.onerror = (e) => {
      const taskId = info.taskId
      if (taskId && handlers.has(taskId)) {
        handlers.get(taskId).reject(new Error(e.message || 'Worker error'))
        handlers.delete(taskId)
      }
      info.status = 'idle'
      info.taskId = null
      if (_onChange) _onChange(getPoolState())
    }

    workerList.push(info)
  }

  let _onChange = null
  let _disposed = false

  function getPoolState() {
    return {
      total: workerList.length,
      idle: workerList.filter(w => w.status === 'idle').length,
      busy: workerList.filter(w => w.status === 'busy').length,
      completed: workerList.reduce((s, w) => s + w.tasksCompleted, 0),
    }
  }

  /** @type {WorkerPool} */
  const pool = {
    get id() { return id },
    get workers() { return workerList },
    get size() { return workerList.length },
    get disposed() { return _disposed },

    /**
     * Run a task on an idle worker. Returns a Promise.
     * @param {string} taskId
     * @param {*} data — will be transferred if Transferable
     * @param {AbortSignal} [signal]
     * @returns {Promise<*>}
     */
    run(taskId, data, signal) {
      const info = workerList.find(w => w.status === 'idle')
      if (!info) {
        return Promise.reject(new Error('No idle workers available'))
      }

      return new Promise((resolve, reject) => {
        info.status = 'busy'
        info.taskId = taskId
        handlers.set(taskId, { resolve, reject })

        // Use transfer list for ArrayBuffer/TypedArray
        const transfer = []
        if (data instanceof ArrayBuffer) {
          transfer.push(data)
        } else if (ArrayBuffer.isView(data) && data.buffer) {
          transfer.push(data.buffer)
        }

        info.worker.postMessage({ taskId, data }, transfer)

        if (signal) {
          signal.addEventListener('abort', () => {
            if (handlers.has(taskId)) {
              handlers.delete(taskId)
              info.status = 'idle'
              info.taskId = null
              reject(new DOMException('Aborted', 'AbortError'))
            }
          }, { once: true })
        }
      })
    },

    /** Subscribe to pool state changes */
    subscribe(fn) {
      _onChange = fn
      fn(getPoolState())
      return () => { _onChange = null }
    },

    /** Terminate all workers */
    dispose() {
      _disposed = true
      for (const info of workerList) {
        info.worker.terminate()
      }
      handlers.clear()
      workerList.length = 0
    },

    /** HyperGraph manifest */
    describe() {
      return {
        kind: 'uploop.workerpool',
        name: `WorkerPool#${id}`,
        size: workerList.length,
        workers: workerList.map(w => ({
          id: `${w.id}`,
          kind: 'worker',
          status: w.status,
          completed: w.tasksCompleted,
        })),
      }
    },
  }

  return pool
}

export default { createWorkerPool }
