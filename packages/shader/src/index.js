/**
 * @uploop/shader — Shader & Material System
 *
 * GLSL/WGSL compilation, uniform block management, material = shader + uniforms.
 * Built-in shader library (unlit, Phong, PBR, post-FX).
 */

export { compileSource, createProgram, getUniforms, getAttributes, parseGLSL, injectDefines } from './compiler.js'
export { createMaterial } from './material.js'
export { createUniformBlock } from './uniform.js'
export { createAttributeLayout, applyAttributeLayout, glType } from './attribute.js'
export * as builtinShaders from './builtin/index.js'
