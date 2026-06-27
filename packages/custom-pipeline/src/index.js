/**
 * @uploop/custom-pipeline — Pluggable render pipeline with injectable stages.
 *
 * Build custom multi-pass rendering pipelines. Each stage reads from
 * input attachments, renders to output attachments. Managed as a
 * HyperGraph of render passes.
 *
 * Usage:
 *   import { createPipeline, createStage, createAttachment, createScreenQuad } from '@uploop/custom-pipeline'
 *
 *   const sceneColor = createAttachment({ name: 'sceneColor', type: 'color', format: 'rgba16f' })
 *   const pipeline = createPipeline({ gl, stages: [geometryStage, lightingStage, postStage] })
 *   pipeline.init()
 *
 *   // In game loop:
 *   pipeline.render()
 *   console.log(pipeline.describe())
 */

export { createPipeline, createScreenQuad } from './pipeline.js'
export { createStage, initStage, executeStage, disposeStage } from './stage.js'
export { createAttachment, initAttachment, disposeAttachment } from './attachment.js'
export { postProcessPreset, deferredPreset, shadowMapPreset } from './presets.js'
