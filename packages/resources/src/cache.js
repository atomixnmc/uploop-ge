/**
 * ResourceCache — LRU-evicting resource cache with optional TTL.
 *
 * Using a doubly-linked list + hash map, get() always promotes
 * the accessed entry to "most recently used". When maxSize is
 * exceeded, the least-recently-used entry is evicted.
 */

/**
 * Create a resource cache with LRU eviction and optional TTL.
 *
 * @param {Object} [opts]
 * @param {number} [opts.maxSize=256] — maximum number of cached entries
 * @param {number} [opts.ttl=0] — time-to-live in ms (0 = no expiry)
 * @returns {ResourceCache}
 */
export function ResourceCache({ maxSize = 256, ttl = 0 } = {}) {
  const map = new Map()
  let head = null  // most-recently-used
  let tail = null  // least-recently-used

  function detach(node) {
    if (node.prev) node.prev.next = node.next
    if (node.next) node.next.prev = node.prev
    if (head === node) head = node.next
    if (tail === node) tail = node.prev
    node.prev = null
    node.next = null
  }

  function prepend(node) {
    node.next = head
    if (head) head.prev = node
    head = node
    if (!tail) tail = node
  }

  function evictLRU() {
    if (!tail) return
    const node = tail
    detach(node)
    map.delete(node.key)
    // Allow GC by nulling the value promise
    node.value = null
  }

  function evictExpired(node) {
    if (ttl > 0 && node.loadedAt && (Date.now() - node.loadedAt > ttl)) {
      detach(node)
      map.delete(node.key)
      node.value = null
      return true
    }
    return false
  }

  /**
   * Get a resource by key. If not cached, calls `loader()` to fetch it.
   * Returns the cached promise if already loading/in cache.
   *
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} loader — factory returning a promise
   * @returns {Promise<T>}
   */
  async function get(key, loader) {
    let node = map.get(key)

    if (node) {
      // Check TTL expiry
      if (evictExpired(node)) node = null
    }

    if (node) {
      // Promote to MRU
      detach(node)
      prepend(node)
      return node.value
    }

    // Evict LRU if at capacity (before inserting new)
    while (map.size >= maxSize) evictLRU()

    // Create the loading promise
    const promise = loader()

    node = { key, value: promise, loadedAt: Date.now(), prev: null, next: null }
    map.set(key, node)
    prepend(node)

    try {
      // Resolve and store the resolved value
      const result = await promise
      node.value = Promise.resolve(result)
      return result
    } catch (err) {
      // Remove failed load from cache
      detach(node)
      map.delete(key)
      throw err
    }
  }

  /**
   * Force-evict an entry so the next get() re-loads it.
   * @param {string} key
   */
  function invalidate(key) {
    const node = map.get(key)
    if (node) {
      detach(node)
      map.delete(key)
      node.value = null
    }
  }

  /** Evict all cached entries. */
  function clear() {
    for (const [, node] of map) {
      detach(node)
      node.value = null
    }
    map.clear()
    head = null
    tail = null
  }

  return {
    get,
    invalidate,
    clear,
    /** Number of currently cached entries */
    get size() { return map.size },
  }
}

export default { ResourceCache }
