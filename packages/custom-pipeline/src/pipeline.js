/**
 * Pipeline — Manages a graph of render stages with attachment flow.
 *
 * The pipeline is a HyperGraph component. Stages are nodes,
 * attachments are edges carrying texture data between stages.
 *
 * @depends types.js, stage.js, attachment.js
 */
import { initStage, executeStage, disposeStage } from './stage.js'
import { disposeAttachment } from './attachment.js'

/**
 * Create a render pipeline.
 * @param {Object} opts
 * @param {WebGL2RenderingContext} opts.gl
 * @param {import('./types.js').Stage[]} [opts.stages=[]]
 * @param {number} [opts.width] — default to canvas size
 * @param {number} [opts.height]
 * @returns {import('./types.js').Pipeline}
 */
export function createPipeline({ gl, stages: stageList = [], width = 0, height = 0 } = {}) {
  const _gl = gl
  /** @type {import('./types.js').Attachment[]} */
  const _attachments = []
  const subscribers = []

  /** @type {import('./types.js').Pipeline} */
  const pipeline = {
    stages: stageList,
    attachments: _attachments,
    width,
    height,

    /** Initialize all stages and attachments */
    init() {
      for (const stage of this.stages) {
        initStage(_gl, stage, this.width, this.height)
        for (const out of stage.outputs) {
          if (!_attachments.includes(out)) {
            _attachments.push(out)
          }
        }
      }
    },

    /** Resize all attachments */
    resize(w, h) {
      this.width = w
      this.height = h
      for (const att of _attachments) {
        const { initAttachment } = require('./attachment.js') // avoid circular
        initAttachment(_gl, att, w, h)
      }
      for (const stage of this.stages) {
        if (stage.program) {
          for (const out of stage.outputs) {
            const { initAttachment } = require('./attachment.js')
            initAttachment(_gl, out, w, h)
          }
        }
      }
    },

    /** Execute all enabled stages in order */
    render(extraUniforms = {}) {
      for (const stage of this.stages) {
        executeStage(_gl, stage, this, extraUniforms)
      }
    },

    /** Execute a single named stage */
    renderStage(name, extraUniforms = {}) {
      const stage = this.stages.find(s => s.name === name)
      if (stage) executeStage(_gl, stage, this, extraUniforms)
    },

    /** Add a stage at the end */
    addStage(stage) {
      this.stages.push(stage)
      if (stage.program || this.width > 0) {
        initStage(_gl, stage, this.width, this.height)
      }
      for (const out of stage.outputs) {
        if (!_attachments.includes(out)) _attachments.push(out)
      }
    },

    /** Remove a stage by name */
    removeStage(name) {
      const idx = this.stages.findIndex(s => s.name === name)
      if (idx >= 0) {
        const stage = this.stages[idx]
        disposeStage(_gl, stage)
        this.stages.splice(idx, 1)
      }
    },

    /** Enable/disable a stage */
    setStageEnabled(name, enabled) {
      const stage = this.stages.find(s => s.name === name)
      if (stage) stage.enabled = enabled
    },

    /** Subscribe to pipeline state */
    subscribe(fn) {
      subscribers.push(fn)
      fn(this.getState())
      return () => {
        const i = subscribers.indexOf(fn)
        if (i >= 0) subscribers.splice(i, 1)
      }
    },

    /** Get pipeline state */
    getState() {
      return {
        stages: this.stages.map(s => ({ name: s.name, enabled: s.enabled })),
        attachments: _attachments.length,
        width: this.width,
        height: this.height,
      }
    },

    /** Dispose all GPU resources */
    dispose() {
      for (const stage of this.stages) {
        disposeStage(_gl, stage)
      }
      for (const att of _attachments) {
        disposeAttachment(_gl, att)
      }
      _attachments.length = 0
      this.stages.length = 0
    },

    /** HyperGraph manifest */
    describe() {
      return {
        kind: 'uploop.pipeline',
        name: 'CustomPipeline',
        nodes: [
          ...this.stages.map(s => ({
            id: `stage.${s.name}`,
            kind: 'render-pass',
            enabled: s.enabled,
          })),
          ..._attachments.map(a => ({
            id: `attachment.${a.name}`,
            kind: 'texture',
            format: a.format,
            size: `${a.width}x${a.height}`,
          })),
        ],
        edges: [
          ...this.stages.flatMap(s =>
            s.outputs.map(o => ({
              from: `stage.${s.name}`,
              to: `attachment.${o.name}`,
              kind: 'writes',
            }))
          ),
          ...this.stages.flatMap(s =>
            s.inputs.map(i => ({
              from: `attachment.${i.name}`,
              to: `stage.${s.name}`,
              kind: 'reads',
            }))
          ),
        ],
      }
    },
  }

  return pipeline
}

/**
 * Create a full-screen quad VAO for post-processing passes.
 * @param {WebGL2RenderingContext} gl
 * @returns {{ vao: WebGLVertexArrayObject, draw: () => void }}
 */
export function createScreenQuad(gl) {
  const vertices = new Float32Array([
    -1, -1,  0, 0,
     1, -1,  1, 0,
    -1,  1,  0, 1,
     1,  1,  1, 1,
  ])

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8)

  return {
    vao,
    draw() {
      gl.bindVertexArray(vao)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
  }
}

export default { createPipeline, createScreenQuad }
