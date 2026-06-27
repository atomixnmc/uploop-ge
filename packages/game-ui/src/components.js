/**
 * UI Components — Button, Slider, Toggle, Label, Panel, ProgressBar.
 *
 * Each component returns a UINode with a `render` function and
 * uploop-style state management. Components are declarative:
 * state drives rendering, events call onUpdate handlers.
 *
 * @depends style.js (roundRect, measureText, clamp)
 */

import { roundRect, measureText, clamp } from './style.js'

let _nextId = 1

// ── Button ──────────────────────────────────────────────────────────

/**
 * Button component.
 *
 * @param {Object} config
 * @param {string} config.text
 * @param {Function} [config.onClick] — called when clicked
 * @param {number} [config.width] — auto-sized if not set
 * @param {number} [config.height=28]
 * @param {boolean} [config.disabled=false]
 * @returns {UINode}
 */
export function Button({ text, onClick, width, height = 28, disabled = false } = {}) {
  const w = width || 0
  return {
    id: `btn_${_nextId++}`,
    type: 'button',
    x: 0, y: 0,
    width: w, height,
    state: { text, onClick, disabled, hover: false, pressed: false },
    render(ctx, node, theme, mouse) {
      const s = node.state
      const { colors, radius, font, padX } = theme
      const isHover = mouse.hoveredId === node.id && !s.disabled
      s.hover = isHover
      const isPress = isHover && mouse.down
      s.pressed = isPress

      // Auto-size if no width
      const tw = measureText(ctx, s.text, font) + padX * 2
      if (!node.width) node.width = tw

      const { x, y } = node
      const w = node.width, h = node.height

      // Background
      let bg = colors.fg
      if (s.disabled) bg = colors.disabled
      else if (isPress) bg = colors.active
      else if (isHover) bg = colors.hover

      ctx.fillStyle = bg
      roundRect(ctx, x, y, w, h, radius)
      ctx.fill()

      // Border
      ctx.strokeStyle = isHover ? colors.accent : colors.border
      ctx.lineWidth = 1
      roundRect(ctx, x, y, w, h, radius)
      ctx.stroke()

      // Text
      ctx.fillStyle = s.disabled ? colors.textDim : colors.text
      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.text, x + w / 2, y + h / 2)

      // Click handling
      if (mouse.clicked && isHover && !s.disabled && s.onClick) {
        s.onClick()
      }
    },
  }
}

// ── Slider ──────────────────────────────────────────────────────────

/**
 * Horizontal slider with label and value display.
 *
 * @param {Object} config
 * @param {string} config.label
 * @param {number} config.value — 0..1
 * @param {Function} config.onChange — called with new value
 * @param {number} [config.width=160]
 * @param {number} [config.height=20]
 * @returns {UINode}
 */
export function Slider({ label, value = 0.5, onChange, width = 160, height = 22 } = {}) {
  return {
    id: `sld_${_nextId++}`,
    type: 'slider',
    x: 0, y: 0,
    width, height,
    state: { label, value: clamp(value, 0, 1), onChange, dragging: false },
    render(ctx, node, theme, mouse) {
      const s = node.state
      const { colors, radius, font } = theme
      const { x, y } = node
      const w = node.width, h = node.height
      const isHover = mouse.hoveredId === node.id
      const isDown = isHover && mouse.down

      if (isDown && !s.dragging) s.dragging = true
      if (!mouse.down) s.dragging = false

      if (s.dragging) {
        const relX = mouse.x - x
        s.value = clamp(relX / w, 0, 1)
        if (s.onChange) s.onChange(s.value)
      }

      // Label
      ctx.fillStyle = colors.textDim
      ctx.font = font
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(`${s.label}: ${Math.round(s.value * 100)}%`, x, y - 2)

      // Track
      const ty = y + 12
      ctx.fillStyle = colors.disabled
      ctx.fillRect(x, ty, w, 4)

      // Fill
      ctx.fillStyle = colors.accent
      ctx.fillRect(x, ty, w * s.value, 4)

      // Thumb
      const tx = x + w * s.value
      ctx.fillStyle = isHover ? colors.accent : colors.fg
      ctx.beginPath()
      ctx.arc(tx, ty + 2, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      ctx.stroke()

      // Click to set
      if (mouse.clicked && isHover) {
        const relX = mouse.x - x
        s.value = clamp(relX / w, 0, 1)
        if (s.onChange) s.onChange(s.value)
      }
    },
  }
}

// ── Toggle ───────────────────────────────────────────────────────────

/**
 * Toggle switch.
 *
 * @param {Object} config
 * @param {string} config.label
 * @param {boolean} [config.checked=false]
 * @param {Function} [config.onChange] — called with new checked state
 * @returns {UINode}
 */
export function Toggle({ label, checked = false, onChange } = {}) {
  const tw = 36, th = 20
  return {
    id: `tgl_${_nextId++}`,
    type: 'toggle',
    x: 0, y: 0,
    width: tw + 80, height: th + 4,
    state: { label, checked, onChange },
    render(ctx, node, theme, mouse) {
      const s = node.state
      const { colors, font } = theme
      const { x, y } = node

      const isHover = mouse.hoveredId === node.id
      if (mouse.clicked && isHover) {
        s.checked = !s.checked
        if (s.onChange) s.onChange(s.checked)
      }

      // Label
      ctx.fillStyle = colors.textDim
      ctx.font = font
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.label, x, y + th / 2)

      // Switch bg
      const sx = x + tw + 10
      ctx.fillStyle = s.checked ? colors.accent : colors.disabled
      roundRect(ctx, sx, y + 2, tw, th, th / 2)
      ctx.fill()

      // Knob
      const kx = s.checked ? sx + tw - th + 2 : sx + 2
      ctx.fillStyle = colors.text
      ctx.beginPath()
      ctx.arc(kx + th / 2 - 1, y + 2 + th / 2, th / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
    },
  }
}

// ── Label ────────────────────────────────────────────────────────────

/**
 * Text label.
 *
 * @param {Object} config
 * @param {string} config.text
 * @param {string} [config.color] — override text color
 * @param {string} [config.align='left'] — 'left'|'center'|'right'
 * @returns {UINode}
 */
export function Label({ text, color, align = 'left' } = {}) {
  return {
    id: `lbl_${_nextId++}`,
    type: 'label',
    x: 0, y: 0,
    width: 0, height: 16,
    state: { text, color, align },
    render(ctx, node, theme, mouse) {
      const s = node.state
      const { font, colors } = theme
      ctx.font = font
      ctx.fillStyle = s.color || colors.textDim
      ctx.textAlign = s.align
      ctx.textBaseline = 'top'
      ctx.fillText(s.text, node.x, node.y)
      node.width = measureText(ctx, s.text, font)
    },
  }
}

// ── Panel ────────────────────────────────────────────────────────────

/**
 * Panel — a bordered container with optional title and children.
 *
 * @param {Object} config
 * @param {string} [config.title]
 * @param {UINode[]} [config.children]
 * @param {number} [config.width=200]
 * @param {number} [config.height=100]
 * @param {number} [config.x=0]
 * @param {number} [config.y=0]
 * @returns {UINode}
 */
export function Panel({ title, children = [], width = 200, height = 100, x = 0, y = 0 } = {}) {
  return {
    id: `pnl_${_nextId++}`,
    type: 'panel',
    x, y,
    width, height,
    state: { title },
    children,
    render(ctx, node, theme, mouse) {
      const { colors, radius, font, fontSize, padX, padY } = theme
      const { x, y } = node
      const w = node.width, h = node.height

      // Background
      ctx.fillStyle = colors.bg
      roundRect(ctx, x, y, w, h, radius)
      ctx.fill()

      // Border
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      roundRect(ctx, x, y, w, h, radius)
      ctx.stroke()

      // Title bar
      if (node.state.title) {
        const titleH = fontSize + padY * 2
        ctx.fillStyle = colors.fg
        roundRect(ctx, x + 1, y + 1, w - 2, titleH, radius)
        ctx.fill()
        ctx.fillStyle = colors.text
        ctx.font = font
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.state.title, x + padX, y + titleH / 2)

        // Render children inside panel
        let cy = y + titleH + padY
        for (const child of node.children) {
          child.x = x + padX
          child.y = cy
          if (typeof child.render === 'function') {
            child.render(ctx, child, theme, mouse)
          }
          cy += (child.height || 0) + 4
        }
      } else {
        let cy = y + padY
        for (const child of node.children) {
          child.x = x + padX
          child.y = cy
          if (typeof child.render === 'function') {
            child.render(ctx, child, theme, mouse)
          }
          cy += (child.height || 0) + 4
        }
      }
    },
  }
}

// ── ProgressBar ──────────────────────────────────────────────────────

/**
 * Progress bar with label.
 *
 * @param {Object} config
 * @param {string} config.label
 * @param {number} config.value — 0..1
 * @param {number} [config.width=160]
 * @param {number} [config.height=16]
 * @param {string} [config.color] — fill color override
 * @returns {UINode}
 */
export function ProgressBar({ label, value = 0, width = 160, height = 16, color } = {}) {
  return {
    id: `pbar_${_nextId++}`,
    type: 'progress',
    x: 0, y: 0,
    width, height,
    state: { label, value: clamp(value, 0, 1), color },
    render(ctx, node, theme, mouse) {
      const s = node.state
      const { colors, radius, font } = theme
      const { x, y } = node
      const w = node.width, h = node.height

      // Label above
      ctx.fillStyle = colors.textDim
      ctx.font = font
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${s.label}: ${Math.round(s.value * 100)}%`, x, y - 2)

      // Track
      ctx.fillStyle = colors.disabled
      roundRect(ctx, x, y, w, h, radius)
      ctx.fill()

      // Fill
      if (s.value > 0) {
        ctx.fillStyle = s.color || colors.accent
        roundRect(ctx, x, y, w * s.value, h, radius)
        ctx.fill()
      }

      // Border
      ctx.strokeStyle = colors.border
      ctx.lineWidth = 1
      roundRect(ctx, x, y, w, h, radius)
      ctx.stroke()
    },
  }
}

export default { Button, Slider, Toggle, Label, Panel, ProgressBar }
