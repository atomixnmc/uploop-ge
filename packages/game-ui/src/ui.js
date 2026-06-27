/**
 * UI System — Canvas 2D overlay UI manager.
 *
 * Manages a tree of UINodes, handles mouse/touch hit testing,
 * and renders components each frame. Designed to work alongside
 * a WebGL render loop — call ui.render() after your 3D scene.
 *
 * Usage:
 *   const ui = createUI({ canvas, width: 1280, height: 720 })
 *   ui.add(Panel({ title: 'HUD', children: [...] }))
 *   // in your render loop:
 *   ui.render()
 */

import { defaultTheme as _defaultTheme } from './style.js'

let _nextId = 1

/**
 * Create a UI system.
 *
 * @param {Object} config
 * @param {HTMLCanvasElement} [config.canvas] — optional canvas (creates overlay if not provided)
 * @param {number} config.width
 * @param {number} config.height
 * @param {Theme} [config.theme] — custom theme
 * @returns {UISystem}
 */
export function createUI({ canvas, width, height, theme } = {}) {
  const _theme = theme || _defaultTheme

  // Create overlay canvas if not provided
  let _canvas = canvas
  let _ctx = null
  if (!_canvas) {
    _canvas = document.createElement('canvas')
    _canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;'
    _canvas.width = width
    _canvas.height = height
  }
  _ctx = _canvas.getContext('2d')

  /** @type {UINode[]} */
  let _nodes = []

  /** @type {MouseState} */
  let _mouse = { x: 0, y: 0, down: false, clicked: false, hoveredId: null }
  let _wasDown = false

  // Mouse event handlers
  function _onMouseMove(e) {
    const rect = _canvas.getBoundingClientRect()
    _mouse.x = (e.clientX - rect.left) * (width / rect.width)
    _mouse.y = (e.clientY - rect.top) * (height / rect.height)
  }
  function _onMouseDown(e) {
    _mouse.down = true
    _onMouseMove(e)
  }
  function _onMouseUp(e) {
    _mouse.down = false
    _mouse.clicked = true
    _onMouseMove(e)
  }

  if (_canvas) {
    _canvas.style.pointerEvents = 'auto'
    _canvas.addEventListener('mousemove', _onMouseMove)
    _canvas.addEventListener('mousedown', _onMouseDown)
    _canvas.addEventListener('mouseup', _onMouseUp)
    // Touch support
    _canvas.addEventListener('touchmove', e => {
      const t = e.touches[0]
      _onMouseMove({ clientX: t.clientX, clientY: t.clientY })
    })
    _canvas.addEventListener('touchstart', e => {
      const t = e.touches[0]
      _onMouseDown({ clientX: t.clientX, clientY: t.clientY })
    })
    _canvas.addEventListener('touchend', () => _onMouseUp({ clientX: _mouse.x, clientY: _mouse.y }))
  }

  const ui = {
    /** @type {UINode[]} */
    get nodes() { return _nodes },

    /**
     * Add a node (or array of nodes).
     * @param {UINode|UINode[]} node
     */
    add(node) {
      if (Array.isArray(node)) {
        for (const n of node) _nodes.push(n)
      } else {
        _nodes.push(node)
      }
      return this
    },

    /**
     * Remove a node by id.
     * @param {string} id
     */
    remove(id) {
      _nodes = _nodes.filter(n => n.id !== id)
      return this
    },

    /**
     * Get a node by id.
     * @param {string} id
     * @returns {UINode|undefined}
     */
    get(id) {
      return _nodes.find(n => n.id === id)
    },

    /**
     * Render all nodes.
     * Call this every frame after your 3D scene.
     */
    render() {
      if (!_ctx) return
      _ctx.clearRect(0, 0, width, height)
      _ctx.save()

      // Hit test: find hovered node (top-most that contains mouse)
      _mouse.hoveredId = null
      for (let i = _nodes.length - 1; i >= 0; i--) {
        if (_hitTest(_nodes[i], _mouse.x, _mouse.y)) {
          _mouse.hoveredId = _nodes[i].id
          break
        }
      }

      // Render all nodes
      for (const node of _nodes) {
        _renderNode(_ctx, node, _theme, _mouse)
      }

      _ctx.restore()

      // Reset clicked after one frame
      _mouse.clicked = false
    },

    /**
     * Handle a raw mouse event (for external event systems).
     * @param {MouseEvent|TouchEvent} e
     * @returns {MouseState}
     */
    handleMouseEvent(e) {
      const rect = _canvas ? _canvas.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 }
      _mouse.x = (e.clientX - rect.left) * (width / rect.width)
      _mouse.y = (e.clientY - rect.top) * (height / rect.height)

      if (e.type === 'mousedown' || e.type === 'touchstart') _mouse.down = true
      if (e.type === 'mouseup' || e.type === 'touchend') {
        _mouse.down = false
        _mouse.clicked = true
      }

      // Hit test
      _mouse.hoveredId = null
      for (let i = _nodes.length - 1; i >= 0; i--) {
        if (_hitTest(_nodes[i], _mouse.x, _mouse.y)) {
          _mouse.hoveredId = _nodes[i].id
          break
        }
      }

      return { ..._mouse }
    },

    /**
     * Get current mouse state.
     * @returns {MouseState}
     */
    get mouse() { return { ..._mouse } },

    /**
     * Get the theme.
     * @returns {Theme}
     */
    get theme() { return _theme },

    /**
     * Describe as HyperGraph manifest.
     * @returns {Object}
     */
    describe() {
      const nodes = _nodes.map(n => ({
        id: n.id,
        kind: n.type,
        label: n.state?.text || n.state?.label || n.state?.title || n.id,
        bounds: { x: n.x, y: n.y, w: n.width, h: n.height },
      }))
      return {
        kind: 'HyperGraph',
        name: 'uploop.game-ui',
        nodes,
        edges: [],
      }
    },

    /**
     * Dispose — remove event listeners and clear nodes.
     */
    dispose() {
      _nodes = []
      if (_canvas) {
        _canvas.removeEventListener('mousemove', _onMouseMove)
        _canvas.removeEventListener('mousedown', _onMouseDown)
        _canvas.removeEventListener('mouseup', _onMouseUp)
      }
    },
  }

  return ui
}

// ── Internal helpers ────────────────────────────────────────────────

function _hitTest(node, mx, my) {
  if (node.children && node.children.length > 0) {
    // Layout nodes: check children
    for (const child of node.children) {
      if (_hitTest(child, mx, my)) return true
    }
    return false
  }
  return mx >= node.x && mx <= node.x + node.width &&
         my >= node.y && my <= node.y + node.height
}

function _renderNode(ctx, node, theme, mouse) {
  if (typeof node.render === 'function') {
    node.render(ctx, node, theme, mouse)
  }
  // Render children recursively
  if (node.children) {
    for (const child of node.children) {
      _renderNode(ctx, child, theme, mouse)
    }
  }
}

export default { createUI }
