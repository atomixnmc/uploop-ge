/**
 * @typedef {Object} ShaderSource
 * @property {string} vertex — GLSL vertex source
 * @property {string} fragment — GLSL fragment source
 * @property {string} [compute] — GLSL/WGSL compute source
 *
 * @typedef {Object} CompiledShader
 * @property {WebGLProgram|GPUShaderModule} program
 * @property {Object<string, UniformInfo>} uniforms
 * @property {Object<string, AttributeInfo>} attributes
 *
 * @typedef {Object} UniformInfo
 * @property {string} type — 'float'|'vec2'|'vec3'|'vec4'|'mat3'|'mat4'|'sampler2D'
 * @property {*} value
 *
 * @typedef {Object} Material
 * @property {CompiledShader} shader
 * @property {Object<string, *>} uniforms
 * @property {Object} state — depth test, blending, cull mode
 */

export default {}
