/**
 * @uploop/scene — Scene Graph & Game Loop
 *
 * Dedicated game loop for real-time graphics with fixed timestep,
 * render interpolation, frustum culling, and frame budget tracking.
 * Entities are HyperGraph-compatible nodes.
 */

export { createGameLoop } from './gameloop.js'
export { Entity } from './entity.js'
export { Transform } from './transform.js'
export { PerspectiveCamera, OrthographicCamera } from './camera.js'
export { DirectionalLight, PointLight, SpotLight, AmbientLight } from './light.js'
export { createScene } from './scene.js'
export { frustumCull, distanceCull } from './culling.js'
export { sortByMaterial, sortBackToFront, sortFrontToBack, sortByMaterialThenFrontToBack, splitOpaqueTransparent } from './sorting.js'
export { batchEntities, batchStats, instanceMatrixData } from './batching.js'
