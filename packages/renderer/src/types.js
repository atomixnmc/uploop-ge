/**
 * @typedef {'webgl2'|'webgpu'} BackendType
 *
 * @typedef {Object} ContextConfig
 * @property {HTMLCanvasElement} canvas
 * @property {BackendType} [prefer]
 * @property {boolean} [antialias=true]
 * @property {'opaque'|'premultiplied'} [alphaMode='opaque']
 *
 * @typedef {Object} RenderContext
 * @property {BackendType} backend
 * @property {WebGL2RenderingContext|GPUDevice} native
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} PipelineConfig
 * @property {CompiledShader} shader
 * @property {VertexFormat} vertexFormat
 * @property {Object} [state] — depth, blend, cull
 *
 * @typedef {Object} Framebuffer
 * @property {number} width
 * @property {number} height
 * @property {WebGLFramebuffer|GPUTexture[]} colorAttachments
 * @property {WebGLRenderbuffer|GPUTexture} [depthStencil]
 */

export default {}
