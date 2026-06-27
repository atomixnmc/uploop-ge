/**
 * @uploop/custom-pipeline — Types
 *
 * @typedef {Object} Stage
 * @property {string} name
 * @property {WebGLProgram|null} program
 * @property {string} vertexShader
 * @property {string} fragmentShader
 * @property {Attachment[]} inputs
 * @property {Attachment[]} outputs
 * @property {boolean} enabled
 * @property {Object} uniforms
 * @property {Function|null} onBind — called before draw
 *
 * @typedef {Object} Attachment
 * @property {string} name
 * @property {'color'|'depth'|'color+depth'} type
 * @property {string} format — 'rgba8'|'rgba16f'|'depth24'
 * @property {number} width
 * @property {number} height
 * @property {WebGLTexture|null} texture
 * @property {WebGLFramebuffer|null} framebuffer
 *
 * @typedef {Object} Pipeline
 * @property {Stage[]} stages
 * @property {Map<string, Attachment>} attachments
 * @property {number} width
 * @property {number} height
 */
