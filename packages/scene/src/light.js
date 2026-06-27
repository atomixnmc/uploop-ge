/**
 * Light — Directional, point, spot, and ambient light sources.
 *
 * @depends @uploop/math (color utility)
 */

import { color } from '@uploop/math'

let _nextId = 1

/** Directional light (like the sun — infinite distance, parallel rays) */
export function DirectionalLight({
  direction = [0, -1, 0],
  intensity = 1,
  lightColor = color.create(1, 1, 1, 1),
  ambientColor = color.create(0.1, 0.1, 0.1, 1),
} = {}) {
  return {
    id: `light_${_nextId++}`,
    type: 'directional',
    direction: new Float32Array(direction),
    intensity,
    color: lightColor,
    ambientColor,
    castShadow: false,
    shadowMapSize: 1024,
    shadowBias: 0.001,
  }
}

/** Point light (omni-directional, attenuated) */
export function PointLight({
  position = [0, 0, 0],
  intensity = 1,
  lightColor = color.create(1, 1, 1, 1),
  range = 10,
  constant = 1,
  linear = 0.09,
  quadratic = 0.032,
} = {}) {
  return {
    id: `light_${_nextId++}`,
    type: 'point',
    position: new Float32Array(position),
    intensity,
    color: lightColor,
    range,
    constant,
    linear,
    quadratic,
    castShadow: false,
  }
}

/** Spot light (directional cone) */
export function SpotLight({
  position = [0, 0, 0],
  direction = [0, -1, 0],
  intensity = 1,
  lightColor = color.create(1, 1, 1, 1),
  range = 10,
  innerConeAngle = Math.PI / 8,
  outerConeAngle = Math.PI / 4,
} = {}) {
  return {
    id: `light_${_nextId++}`,
    type: 'spot',
    position: new Float32Array(position),
    direction: new Float32Array(direction),
    intensity,
    color: lightColor,
    range,
    innerConeAngle,
    outerConeAngle,
    castShadow: false,
  }
}

/** Ambient light (uniform fill) */
export function AmbientLight({
  intensity = 1,
  lightColor = color.create(0.2, 0.2, 0.2, 1),
} = {}) {
  return {
    id: `light_${_nextId++}`,
    type: 'ambient',
    intensity,
    color: lightColor,
  }
}

export default { DirectionalLight, PointLight, SpotLight, AmbientLight }
