/**
 * Game Loop — Fixed-timestep update + render interpolation.
 *
 * Designed as a standalone loop (no @uploop/core dependency) with an API
 * compatible with HyperGraph concepts. Provides a dedicated game loop
 * optimized for real-time graphics.
 *
 * Features:
 *   - Fixed timestep for physics/update (decoupled from render rate)
 *   - Render interpolation (smooth between fixed steps)
 *   - Frame budget (drop frames if render exceeds budget)
 *   - Accumulator pattern (stable physics regardless of frame rate)
 *   - Pause/resume, time scaling
 */

const EPSILON = 0.0001

/**
 * @param {GameLoopConfig} config
 * @returns {GameLoop}
 */
export function createGameLoop({
  state = {},
  update = {},
  render = null,
  fixedTimestep = 1 / 60,
  maxFrameBudget = 16,
  interpolation = true,
  maxUpdatesPerFrame = 10,
  timeScale = 1,
  onError = null,
} = {}) {
  let _state = { ...state }
  let _running = false
  let _rafId = null
  let _lastTime = 0
  let _accumulator = 0
  let _currentTime = 0
  let _frameCount = 0
  let _updateCount = 0
  let _fps = 0
  let _ups = 0
  let _fpsCounter = 0
  let _upsCounter = 0
  let _fpsTime = 0
  let _subscribers = []

  const loop = {
    /** Current game time (seconds) */
    get time() { return _currentTime },
    /** Fixed timestep (seconds) */
    get fixedTimestep() { return fixedTimestep },
    set fixedTimestep(v) { fixedTimestep = v },
    /** Time scale multiplier (0 = paused, 1 = normal) */
    get timeScale() { return timeScale },
    set timeScale(v) { timeScale = Math.max(0, v) },
    /** Is the loop running? */
    get running() { return _running },
    /** Total frames rendered */
    get frameCount() { return _frameCount },
    /** Total fixed updates executed */
    get updateCount() { return _updateCount },
    /** Current FPS (approximate, updated per second) */
    get fps() { return _fps },
    /** Current UPS — updates per second */
    get ups() { return _ups },

    /** Start the loop */
    start() {
      if (_running) return
      _running = true
      _lastTime = performance.now() / 1000
      _fpsTime = _lastTime
      _tick(performance.now())  // pass ms, _tick converts to seconds
    },

    /** Stop the loop */
    stop() {
      _running = false
      if (_rafId) {
        cancelAnimationFrame(_rafId)
        _rafId = null
      }
    },

    /** Resume from current state */
    resume() {
      if (!_running) {
        _running = true
        _lastTime = performance.now() / 1000
        _tick(performance.now())
      }
    },

    /** Pause without resetting */
    pause() {
      _running = false
      if (_rafId) {
        cancelAnimationFrame(_rafId)
        _rafId = null
      }
    },

    /** Get current state */
    getState() {
      return _state
    },

    /** Set state directly */
    setState(patch) {
      _state = { ..._state, ...patch }
      return _state
    },

    /** Send an event to update handlers */
    send(event, ...args) {
      const handler = update[event]
      if (!handler) {
        if (onError) onError(new Error(`Unknown event: ${event}`))
        return
      }
      try {
        const result = handler(_state, ...args)
        if (result !== undefined && result !== _state) {
          _state = { ..._state, ...result }
        }
      } catch (e) {
        if (onError) onError(e)
        else throw e
      }
      return _state
    },

    /** Subscribe to state changes */
    subscribe(fn) {
      _subscribers.push(fn)
      return () => {
        _subscribers = _subscribers.filter(s => s !== fn)
      }
    },

    /** Reset to initial state */
    reset(initialState) {
      _state = initialState ? { ...initialState } : { ...state }
      _accumulator = 0
      _currentTime = 0
      _frameCount = 0
      _updateCount = 0
    },

    /** Dispose (stop + clear subscribers) */
    dispose() {
      this.stop()
      _subscribers = []
    },

    /** Describe as HyperGraph manifest (compatible format) */
    describe() {
      return {
        kind: 'uploop.gameloop',
        name: 'GameLoop',
        state: Object.keys(_state),
        update: Object.keys(update),
        fixedTimestep,
        interpolation,
      }
    },
  }

  function _tick(timestamp) {
    // rAF gives milliseconds — convert to seconds
    timestamp = timestamp / 1000
    if (!_running) return

    _rafId = requestAnimationFrame(_tick)

    const elapsed = timestamp - _lastTime
    _lastTime = timestamp

    // FPS counter (once per second)
    _fpsCounter++
    if (timestamp - _fpsTime >= 1) {
      _fps = _fpsCounter
      _ups = _upsCounter
      _fpsCounter = 0
      _upsCounter = 0
      _fpsTime = timestamp
    }

    const dt = Math.min(elapsed, maxFrameBudget / 1000) * timeScale

    if (dt <= 0) return

    _accumulator += dt
    _currentTime += dt

    let updates = 0
    while (_accumulator >= fixedTimestep && updates < maxUpdatesPerFrame) {
      _fixedUpdate(fixedTimestep)
      _accumulator -= fixedTimestep
      updates++
      _updateCount++
      _upsCounter++
    }

    // Clamp accumulator to prevent spiral of death
    if (_accumulator > fixedTimestep * maxUpdatesPerFrame) {
      _accumulator = fixedTimestep * maxUpdatesPerFrame
    }

    // Render
    if (render) {
      const alpha = interpolation ? _accumulator / fixedTimestep : 0
      try {
        render(_state, Math.min(alpha, 1))
      } catch (e) {
        if (onError) onError(e)
        else throw e
      }
    }

    _frameCount++

    // Notify subscribers
    if (_subscribers.length > 0) {
      for (const sub of _subscribers) {
        sub(_state)
      }
    }
  }

  function _fixedUpdate(dt) {
    if (update.tick) {
      try {
        const result = update.tick(_state, dt)
        if (result !== undefined && result !== _state) {
          _state = { ..._state, ...result }
        }
      } catch (e) {
        if (onError) onError(e)
        else throw e
      }
    }
  }

  return loop
}

export default { createGameLoop }
