/**
 * Theme — Styling system for game UI components.
 *
 * Themes define colors, fonts, padding, and border radius.
 * Components reference theme values; users can create custom themes
 * or extend the default.
 */

/** @returns {Theme} */
export function createTheme(overrides = {}) {
  return { ...defaultTheme, ...overrides,
    colors: { ...defaultTheme.colors, ...(overrides.colors || {}) },
  }
}

export const defaultTheme = {
  font: '12px monospace',
  fontSize: 12,
  textColor: '#e0e0e0',
  colors: {
    bg:       'rgba(16,16,24,0.92)',
    fg:       '#2a2a3a',
    accent:   '#4488cc',
    border:   '#333355',
    hover:    'rgba(68,136,204,0.2)',
    active:   'rgba(68,136,204,0.4)',
    disabled: 'rgba(100,100,120,0.3)',
    success:  '#44aa66',
    warning:  '#ccaa44',
    danger:   '#cc4444',
    text:     '#e0e0e0',
    textDim:  '#888',
  },
  radius: 4,
  padX: 10,
  padY: 6,
}

/**
 * Measure text width using a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {string} [font]
 * @returns {number}
 */
export function measureText(ctx, text, font) {
  ctx.save()
  if (font) ctx.font = font
  const w = ctx.measureText(text).width
  ctx.restore()
  return w
}

/**
 * Draw a rounded rectangle path.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** Clamp value between min and max */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/** Linear interpolation */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

export default { createTheme, defaultTheme, measureText, roundRect, clamp, lerp }
