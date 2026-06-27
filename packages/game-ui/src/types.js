/**
 * @typedef {Object} UINode
 * @property {string} id
 * @property {string} type — 'panel'|'button'|'slider'|'toggle'|'label'|'progress'
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {Object} [style] — theme overrides
 * @property {Object} [state] — component-specific state
 * @property {Function} [render] — (ctx, node, theme, mouse) draw function
 * @property {UINode[]} [children] — nested layout children
 * @property {string} [layout] — 'stack'|'row'|'grid'
 * @property {number} [gap] — layout gap in px
 *
 * @typedef {Object} UISystem
 * @property {Function} add — add a node (or array of nodes)
 * @property {Function} remove — remove by id
 * @property {Function} get — get node by id
 * @property {Function} render — draw all nodes
 * @property {Function} update — handle mouse/touch events → state changes
 * @property {Function} describe — HyperGraph manifest
 * @property {Function} dispose — cleanup
 *
 * @typedef {Object} Theme
 * @property {string} font — default font
 * @property {number} fontSize
 * @property {string} textColor
 * @property {Object} colors — { bg, fg, accent, border, hover, active, disabled }
 * @property {number} radius — border radius
 * @property {number} padX — horizontal padding
 * @property {number} padY — vertical padding
 *
 * @typedef {{ x: number, y: number, down: boolean, clicked: boolean, hoveredId: string|null }} MouseState
 */

export default {}
