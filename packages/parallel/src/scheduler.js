/**
 * Scheduler — Coordinates tasks across workers with priority queuing.
 *
 * The scheduler is a HyperGraph component node. Tasks enter via schedule(),
 * flow through workers, and results are collected. Stats are observable
 * via subscribe().
 *
 * @depends types.js, pool.js, task.js
 */
import { createWorkerPool } from './pool.js'

/**
 * Create a task scheduler.
 * @param {import('./types.js').SchedulerConfig} config
 * @returns {Scheduler}
 */
export function createScheduler({ pool, maxConcurrent } = {}) {
  /** @type {import('./types.js').Task[]} */
  const queue = []
  /** @type {import('./types.js').Task[]} */
  const running = []
  /** @type {import('./types.js').Task[]} */
  const done = []
  /** @type {import('./types.js').Task[]} */
  const errors = []
  const subscribers = []
  let _paused = false
  let _disposed = false

  const max = maxConcurrent || (pool ? pool.size : 4)

  function notify() {
    const state = getState()
    for (const sub of subscribers) sub(state)
  }

  /** @type {Scheduler} */
  const scheduler = {
    get queue() { return queue },
    get running() { return running },
    get done() { return done },
    get errors() { return errors },
    get paused() { return _paused },

    /** Schedule a task or batch */
    schedule(tasks) {
      const list = Array.isArray(tasks) ? tasks : [tasks]
      for (const t of list) {
        t.status = 'queued'
        queue.push(t)
      }
      // Sort by priority (lower = higher priority)
      queue.sort((a, b) => a.priority - b.priority)
      notify()
      if (!_paused) this._drain()
    },

    /** Cancel a task by id */
    cancel(taskId) {
      const idx = queue.findIndex(t => t.id === taskId)
      if (idx >= 0) {
        queue.splice(idx, 1)
        notify()
        return true
      }
      return false
    },

    /** Pause scheduling (running tasks continue) */
    pause() { _paused = true },

    /** Resume scheduling */
    resume() {
      _paused = false
      this._drain()
    },

    /** Internal: drain queue into idle workers */
    async _drain() {
      if (!pool || _disposed || _paused) return

      while (queue.length > 0 && running.length < max) {
        const idleCount = pool.workers.filter(w => w.status === 'idle').length
        if (idleCount === 0) break

        const task = queue.shift()
        running.push(task)
        task.startedAt = performance.now()
        task.status = 'running'
        notify()

        try {
          const result = await pool.run(task.id, task.input || task, task.signal)
          task.output = result
          task.status = 'done'
          task.completedAt = performance.now()
          running.splice(running.indexOf(task), 1)
          done.push(task)
        } catch (e) {
          task.error = e.message
          task.status = 'error'
          task.completedAt = performance.now()
          running.splice(running.indexOf(task), 1)
          errors.push(task)
        }

        notify()
        // Continue draining
        this._drain()
      }
    },

    /** Get current scheduler state */
    getState() {
      return {
        queued: queue.length,
        running: running.length,
        done: done.length,
        errors: errors.length,
        total: queue.length + running.length + done.length + errors.length,
        workers: pool ? pool.workers.map(w => ({
          id: w.id,
          status: w.status,
          taskId: w.taskId,
          completed: w.tasksCompleted,
        })) : [],
      }
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

    /** Wait for all tasks to complete */
    async waitAll() {
      while (queue.length > 0 || running.length > 0) {
        await new Promise(r => setTimeout(r, 10))
      }
    },

    /** Dispose scheduler (does not dispose pool) */
    dispose() {
      _disposed = true
    },

    /** HyperGraph manifest */
    describe() {
      return {
        kind: 'uploop.scheduler',
        name: 'Scheduler',
        nodes: [
          { id: 'scheduler.queue', kind: 'queue', count: queue.length },
          { id: 'scheduler.running', kind: 'in-flight', count: running.length },
          { id: 'scheduler.done', kind: 'completed', count: done.length },
          { id: 'scheduler.errors', kind: 'failed', count: errors.length },
          ...(pool ? [pool.describe()] : []),
        ],
        edges: [
          { from: 'scheduler.queue', to: 'scheduler.running', kind: 'dispatches' },
          { from: 'scheduler.running', to: 'scheduler.done', kind: 'completes' },
          { from: 'scheduler.running', to: 'scheduler.errors', kind: 'rejects' },
        ],
      }
    },
  }

  return scheduler
}

export default { createScheduler }
