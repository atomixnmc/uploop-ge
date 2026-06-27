/**
 * @uploop/renderer — WebGL/WebGPU Backend
 *
 * Unified API over WebGL 2.0 and WebGPU. Auto-selects WebGPU when available,
 * falls back to WebGL 2.0. Provides canvas context, render pipeline,
 * framebuffer management, draw commands, and GPU buffer/texture primitives.
 */

export { createContext, getCapabilities } from './context.js'
export { createPipeline } from './pipeline.js'
export { createFramebuffer, bindFramebuffer, blitFramebuffer, resizeFramebuffer, deleteFramebuffer } from './framebuffer.js'
export { createTexture, createTextureFromImage, createCubemap, bindTexture, deleteTexture } from './texture.js'
export { createVertexBuffer, createIndexBuffer, createUniformBuffer, updateBuffer, deleteBuffer } from './buffer.js'
export { draw, drawIndexed, drawInstanced, clear, viewport, scissor, readPixels } from './draw.js'
