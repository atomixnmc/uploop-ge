import { describe, it, expect } from 'vitest'
import { parseGLSL, injectDefines, createUniformBlock, createMaterial, createAttributeLayout, builtinShaders } from '../src/index.js'
import { VertexFormat } from '../../geometry/src/vertex.js'

describe('parseGLSL', () => {
  it('finds uniforms and defines', () => {
    const src = `#version 300 es
#define USE_TEXTURE 1
uniform mat4 uModel;
uniform vec3 uColor;
void main() {}`

    const result = parseGLSL(src)
    expect(result.uniforms).toHaveLength(2)
    expect(result.uniforms[0]).toEqual({ type: 'mat4', name: 'uModel' })
    expect(result.defines).toHaveLength(1)
    expect(result.defines[0].name).toBe('USE_TEXTURE')
  })
})

describe('injectDefines', () => {
  it('injects after #version', () => {
    const src = '#version 300 es\nvoid main() {}'
    const result = injectDefines(src, { FOO: '1', BAR: '2' })
    expect(result).toContain('#version 300 es')
    expect(result).toContain('#define FOO 1')
    expect(result).toContain('#define BAR 2')
    expect(result).toContain('void main()')
  })

  it('injects at top when no version', () => {
    const src = 'void main() {}'
    const result = injectDefines(src, { DEBUG: '1' })
    expect(result).toContain('#define DEBUG 1')
    expect(result).toContain('void main()')
    expect(result.indexOf('#define') < result.indexOf('void')).toBe(true)
  })
})

describe('createUniformBlock', () => {
  it('creates and sets values', () => {
    const block = createUniformBlock({
      uColor: { type: 'vec3', default: [1, 1, 1] },
      uTime: { type: 'float', default: 0 },
    })

    expect(block.get('uColor')).toEqual([1, 1, 1])
    block.set('uTime', 5.0)
    expect(block.get('uTime')).toBe(5.0)

    block.setAll({ uColor: [0, 0, 0], uTime: 10 })
    expect(block.get('uColor')).toEqual([0, 0, 0])
    expect(block.get('uTime')).toBe(10)

    block.markAllDirty()
  })
})

describe('createMaterial', () => {
  it('creates with defaults', () => {
    const mat = createMaterial({
      shader: { program: {}, uniforms: {}, attributes: {} },
      uniforms: { uColor: [1, 0, 0, 1] },
    })

    expect(mat.state.depthTest).toBe(true)
    expect(mat.state.blend).toBe(false)
    expect(mat.uniforms.uColor).toEqual([1, 0, 0, 1])

    mat.setUniform('uTime', 1.5)
    expect(mat.uniforms.uTime).toBe(1.5)

    mat.setUniforms({ uColor: [0, 1, 0, 1] })
    expect(mat.uniforms.uColor).toEqual([0, 1, 0, 1])

    const clone = mat.clone()
    expect(clone.uniforms.uTime).toBe(1.5)
    expect(clone).not.toBe(mat)
  })
})

describe('createAttributeLayout', () => {
  it('maps format attributes to shader locations', () => {
    const format = VertexFormat(['position', 'normal', 'uv'])
    const shaderAttrs = {
      aPosition: { location: 0, name: 'aPosition', type: 'vec3', size: 3 },
      aNormal: { location: 1, name: 'aNormal', type: 'vec3', size: 3 },
      aUV: { location: 2, name: 'aUV', type: 'vec2', size: 2 },
    }

    const layout = createAttributeLayout(format, shaderAttrs)
    expect(layout).toHaveLength(3)
    expect(layout[0].location).toBe(0)
    expect(layout[0].stride).toBe(format.stride)
    expect(layout[2].size).toBe(2)
  })
})

describe('builtinShaders', () => {
  it('has all shader types', () => {
    expect(builtinShaders.unlit).toBeDefined()
    expect(builtinShaders.unlit.vertex).toBeDefined()
    expect(builtinShaders.unlit.fragment).toBeDefined()

    expect(builtinShaders.phong).toBeDefined()
    expect(builtinShaders.pbr).toBeDefined()
    expect(builtinShaders.post).toBeDefined()
    expect(builtinShaders.post.copyFragment).toBeDefined()
    expect(builtinShaders.post.blurFragment).toBeDefined()
    expect(builtinShaders.post.tonemapFragment).toBeDefined()
  })

  it('all shaders compile as valid GLSL structure', () => {
    // Check that all shader sources contain #version 300 es and main()
    const shaders = [
      builtinShaders.unlit.vertex, builtinShaders.unlit.fragment,
      builtinShaders.phong.vertex, builtinShaders.phong.fragment,
      builtinShaders.pbr.vertex, builtinShaders.pbr.fragment,
      builtinShaders.post.copyFragment,
      builtinShaders.post.blurFragment,
      builtinShaders.post.tonemapFragment,
    ]
    for (const src of shaders) {
      expect(src).toContain('#version 300 es')
      expect(src).toContain('void main()')
    }
  })
})
