/**
 * @uploop/game-ui — Uploop Game UI Components
 *
 * Canvas 2D overlay UI for WebGL games/graphics. Built on the uploop
 * architecture: state → update → render. All components are declarative
 * and expose HyperGraph manifests.
 *
 * Usage:
 *   import { createUI, Button, Slider, Panel, VStack, HStack } from '@uploop/game-ui'
 *   const ui = createUI({ canvas, width: 1280, height: 720 })
 *   ui.add(Button({ text: 'Start', onClick: () => game.send('start') }))
 *   ui.render()
 */

export { createUI } from './ui.js'
export { Button, Slider, Toggle, Label, Panel, ProgressBar } from './components.js'
export { VStack, HStack, Grid, Spacer } from './layout.js'
export { createTheme, defaultTheme } from './style.js'

// Re-export from uploop concepts
export * from './types.js'
