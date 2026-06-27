/**
 * Color — RGBA Color Utilities
 *
 * All values are 0..1 (floating point), matching GPU conventions.
 * Use color.toBytes() for 0..255 Uint8 output when needed.
 */

import * as vec4 from './vec4.js'

/**
 * Create a color (RGBA, 0..1)
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} [a=1]
 * @returns {Vec4}
 */
export function create(r = 0, g = 0, b = 0, a = 1) {
  return vec4.set(vec4.create(), r, g, b, a)
}

/** Create from hex string '#rrggbb' or '#rgb' */
export function fromHex(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]
  const n = parseInt(h, 16)
  return create(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1)
}

/** Create from 0..255 bytes */
export function fromBytes(r, g, b, a = 255) {
  return create(r / 255, g / 255, b / 255, a / 255)
}

/** Convert to hex string */
export function toHex(c) {
  const r = Math.round(c[0] * 255), g = Math.round(c[1] * 255), b = Math.round(c[2] * 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

/** Convert to Uint8Array (0..255) */
export function toBytes(c) {
  return new Uint8Array([Math.round(c[0]*255), Math.round(c[1]*255), Math.round(c[2]*255), Math.round(c[3]*255)])
}

// --- HSL ---

/** Create from HSL (h: 0..1, s: 0..1, l: 0..1) */
export function fromHSL(h, s, l, a = 1) {
  if (s === 0) return create(l, l, l, a)
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return create(hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3), a)
}

/** Convert to HSL (returns [h, s, l, a]) */
export function toHSL(c) {
  const r = c[0], g = c[1], b = c[2]
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l, c[3]]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6
  }
  return [h, s, l, c[3]]
}

// --- Linear / sRGB ---

/** sRGB gamma → linear */
export function toLinear(c) {
  const f = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  return create(f(c[0]), f(c[1]), f(c[2]), c[3])
}

/** Linear → sRGB gamma */
export function toSRGB(c) {
  const f = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1/2.4) - 0.055
  return create(f(c[0]), f(c[1]), f(c[2]), c[3])
}

// --- Operations ---

export function clone(c) { return create(c[0], c[1], c[2], c[3]) }

export function copy(out, c) { return vec4.copy(out, c) }

export function multiply(out, a, b) {
  out[0] = a[0] * b[0]; out[1] = a[1] * b[1]; out[2] = a[2] * b[2]; out[3] = a[3] * b[3]
  return out
}

/** Blend a over b with alpha compositing */
export function alphaBlend(out, a, b) {
  const alpha = a[3] + b[3] * (1 - a[3])
  if (alpha < 0.00001) return vec4.zero()
  out[0] = (a[0] * a[3] + b[0] * b[3] * (1 - a[3])) / alpha
  out[1] = (a[1] * a[3] + b[1] * b[3] * (1 - a[3])) / alpha
  out[2] = (a[2] * a[3] + b[2] * b[3] * (1 - a[3])) / alpha
  out[3] = alpha
  return out
}

/** Lerp between two colors */
export function lerp(out, a, b, t) {
  return vec4.lerp(out, a, b, t)
}

/** Lighten by factor (0..1 = darker, 1..∞ = lighter) */
export function lighten(out, c, factor) {
  return vec4.scale(out, c, factor)
}

/** Darken by factor (0..1) */
export function darken(out, c, factor) {
  return lighten(out, c, factor)
}

/** Multiply by alpha */
export function alpha(out, c, a) {
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; out[3] = c[3] * a
  return out
}

/** Luminance (perceived brightness, ITU-R BT.709) */
export function luminance(c) {
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** Contrast between two colors (WCAG ratio) */
export function contrast(a, b) {
  const l1 = luminance(a) + 0.05
  const l2 = luminance(b) + 0.05
  return l1 > l2 ? l1 / l2 : l2 / l1
}

export default { create, fromHex, fromBytes, toHex, toBytes, fromHSL, toHSL,
  toLinear, toSRGB, clone, copy, multiply, alphaBlend, lerp,
  lighten, darken, alpha, luminance, contrast }
