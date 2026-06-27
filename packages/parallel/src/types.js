/**
 * @uploop/parallel — Types
 *
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} name
 * @property {number} priority — lower = higher priority
 * @property {'queued'|'running'|'done'|'error'} status
 * @property {*} input — data sent to worker
 * @property {*} output — result from worker
 * @property {string|null} error
 * @property {number} createdAt
 * @property {number|null} startedAt
 * @property {number|null} completedAt
 *
 * @typedef {Object} WorkerInfo
 * @property {number} id
 * @property {Worker} worker
 * @property {'idle'|'busy'} status
 * @property {string|null} taskId
 * @property {number} tasksCompleted
 *
 * @typedef {Object} PoolConfig
 * @property {number} [workers=4]
 * @property {string|URL} source
 * @property {'module'|'classic'} [type='module']
 *
 * @typedef {Object} SchedulerConfig
 * @property {WorkerPool} pool
 * @property {number} [maxConcurrent]
 *
 * @typedef {Object} SchedulerState
 * @property {Task[]} queued
 * @property {Task[]} running
 * @property {Task[]} done
 * @property {Task[]} errors
 * @property {WorkerInfo[]} workers
 */
