/**
 * Layout — Stack, Row, Grid layout containers.
 *
 * Layout containers are UINodes with `children` and a `layout` type.
 * During render, they compute child positions based on the layout mode
 * and delegate rendering to children.
 */

import { measureText } from './style.js'

let _nextId = 1

/**
 * Vertical stack layout. Children are stacked top-to-bottom.
 * Returns a layout node (not drawn itself, just positions children).
 *
 * @param {Object} config
 * @param {UINode[]} config.children
 * @param {number} [config.gap=4]
 * @param {number} [config.x=0]
 * @param {number} [config.y=0]
 * @param {string} [config.align='left'] — 'left'|'center'|'right'|'stretch'
 * @returns {UINode}
 */
export function VStack({ children = [], gap = 4, x = 0, y = 0, align = 'left' } = {}) {
  return {
    id: `vstack_${_nextId++}`,
    type: 'layout',
    layout: 'stack',
    x, y, gap, align, children,
    width: 0, height: 0,
    state: {},
    render(ctx, node, theme, mouse) {
      let cy = node.y
      let maxW = 0
      for (const child of node.children) {
        child.x = node.x
        child.y = cy
        if (typeof child.render === 'function') {
          child.render(ctx, child, theme, mouse)
        }
        const cw = child.width || 0
        const ch = (child.height || 0) + node.gap
        if (cw > maxW) maxW = cw
        cy += ch
      }
      node.width = maxW
      node.height = cy - node.y - node.gap
      return true
    },
  }
}

/**
 * Horizontal row layout. Children are laid out left-to-right.
 */
export function HStack({ children = [], gap = 8, x = 0, y = 0, align = 'top' } = {}) {
  return {
    id: `hstack_${_nextId++}`,
    type: 'layout',
    layout: 'row',
    x, y, gap, align, children,
    width: 0, height: 0,
    state: {},
    render(ctx, node, theme, mouse) {
      let cx = node.x
      let maxH = 0
      for (const child of node.children) {
        child.x = cx
        child.y = node.y
        if (typeof child.render === 'function') {
          child.render(ctx, child, theme, mouse)
        }
        const cw = (child.width || 0) + node.gap
        const ch = child.height || 0
        if (ch > maxH) maxH = ch
        cx += cw
      }
      node.width = cx - node.x - node.gap
      node.height = maxH
      return true
    },
  }
}

/**
 * Grid layout. Children are placed in a rows×cols grid.
 */
export function Grid({ children = [], cols = 2, gap = 8, x = 0, y = 0, cellWidth = 100, cellHeight = 30 } = {}) {
  return {
    id: `grid_${_nextId++}`,
    type: 'layout',
    layout: 'grid',
    x, y, gap, cols, cellWidth, cellHeight, children,
    width: 0, height: 0,
    state: {},
    render(ctx, node, theme, mouse) {
      for (let i = 0; i < node.children.length; i++) {
        const col = i % node.cols
        const row = Math.floor(i / node.cols)
        const child = node.children[i]
        child.x = node.x + col * (node.cellWidth + node.gap)
        child.y = node.y + row * (node.cellHeight + node.gap)
        if (typeof child.render === 'function') {
          child.render(ctx, child, theme, mouse)
        }
      }
      const rows = Math.ceil(node.children.length / node.cols)
      node.width = node.cols * (node.cellWidth + node.gap) - node.gap
      node.height = rows * (node.cellHeight + node.gap) - node.gap
      return true
    },
  }
}

/**
 * Spacer — empty space for layout.
 * @param {number} width
 * @param {number} [height=0]
 */
export function Spacer(width, height = 0) {
  return {
    id: `spacer_${_nextId++}`,
    type: 'spacer',
    x: 0, y: 0,
    width, height,
    state: {},
    render() { return false },
  }
}

export default { VStack, HStack, Grid, Spacer }
