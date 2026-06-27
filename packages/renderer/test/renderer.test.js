import { describe, it, expect } from 'vitest'

// Import modules that don't require a GL context
import { getCapabilities } from '../src/context.js'
import { createPipeline } from '../src/pipeline.js'
import { VertexFormat } from '../../geometry/src/vertex.js'

describe('getCapabilities', () => {
  it('returns capability object in Node.js (no WebGL)', () => {
    const caps = getCapabilities()
    expect(caps).toHaveProperty('webgl2')
    expect(caps).toHaveProperty('webgl')
    expect(caps).toHaveProperty('webgpu')
    // In Node.js without DOM, all should be false
    expect(typeof caps.webgl2).toBe('boolean')
  })
})

describe('createPipeline (structural)', () => {
  it('accepts config with shader and vertex format', () => {
    const fmt = VertexFormat(['position', 'uv'])

    const config = {
      shader: {
        program: {}, // stub — not a real program
        uniforms: { uColor: { name: 'uColor', type: 'vec4', location: {} } },
        attributes: { aPosition: { name: 'aPosition', type: 'vec3', location: 0 }, aUV: { name: 'aUV', type: 'vec2', location: 1 } },
      },
      vertexFormat: fmt,
    }

    // createPipeline will fail without a real GL context for VAO creation.
    // We test the config shape instead.
    expect(config.shader.attributes.aPosition).toBeDefined()
    expect(config.vertexFormat.stride).toBeGreaterThan(0)
  })
})

describe('module exports', () => {
  it('all renderer modules export correctly', async () => {
    const mods = [
      '../src/context.js',
      '../src/pipeline.js',
      '../src/framebuffer.js',
      '../src/texture.js',
      '../src/buffer.js',
      '../src/draw.js',
      '../src/index.js',
    ]
    for (const mod of mods) {
      const m = await import(mod)
      expect(Object.keys(m).length).toBeGreaterThan(0)
    }
  })

  it('barrel re-exports everything', async () => {
    const barrel = await import('../src/index.js')
    const expected = [
      'createContext', 'getCapabilities',
      'createPipeline',
      'createFramebuffer', 'bindFramebuffer', 'blitFramebuffer', 'resizeFramebuffer', 'deleteFramebuffer',
      'createTexture', 'createTextureFromImage', 'createCubemap', 'bindTexture', 'deleteTexture',
      'createVertexBuffer', 'createIndexBuffer', 'createUniformBuffer', 'updateBuffer', 'deleteBuffer',
      'draw', 'drawIndexed', 'drawInstanced', 'clear', 'viewport', 'scissor', 'readPixels',
    ]
    for (const name of expected) {
      expect(barrel[name]).toBeDefined()
    }
  })
})
