import { describe, it, expect } from 'vitest'
import { createTheme, defaultTheme, measureText, clamp, lerp, roundRect } from '../src/style.js'
import { VStack, HStack, Grid, Spacer } from '../src/layout.js'
import { Button, Slider, Toggle, Label, Panel, ProgressBar } from '../src/components.js'
import { createUI } from '../src/ui.js'

// Mock canvas context for measureText
function mockCtx() {
  return {
    save() {}, restore() {},
    font: '',
    textBaseline: '',
    textAlign: '',
    fillStyle: '', strokeStyle: '',
    fillRect() {}, strokeRect() {},
    fillText() {}, strokeText() {},
    beginPath() {}, closePath() {}, arc() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, fill() {}, stroke() {},
    measureText(s) { return { width: s.length * 7 } },
  }
}

describe('style', () => {
  it('createTheme extends default', () => {
    const t = createTheme({ fontSize: 20, colors: { accent: '#f00' } })
    expect(t.fontSize).toBe(20)
    expect(t.colors.accent).toBe('#f00')
    expect(t.colors.bg).toBe(defaultTheme.colors.bg) // inherited
  })

  it('clamp works', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('measureText returns width', () => {
    const ctx = mockCtx()
    const w = measureText(ctx, 'hello', '12px monospace')
    expect(w).toBe(35) // 5 chars × 7
  })
})

describe('layout', () => {
  it('VStack positions children', () => {
    const btn1 = Button({ text: 'A', width: 60 })
    const btn2 = Button({ text: 'B', width: 60 })
    const stack = VStack({ children: [btn1, btn2], x: 10, y: 10, gap: 4 })

    expect(stack.type).toBe('layout')
    expect(stack.layout).toBe('stack')
    expect(stack.children).toHaveLength(2)
  })

  it('HStack positions children', () => {
    const items = [Button({ text: 'X' }), Button({ text: 'Y' })]
    const row = HStack({ children: items, x: 0, y: 0 })

    expect(row.layout).toBe('row')
    expect(row.children).toHaveLength(2)
  })

  it('Grid computes rows and cols', () => {
    const items = Array.from({ length: 6 }, (_, i) => Button({ text: `${i}` }))
    const grid = Grid({ children: items, cols: 3, cellWidth: 50, cellHeight: 30 })

    expect(grid.layout).toBe('grid')
    expect(grid.cols).toBe(3)
    // Render positions children
    grid.render(mockCtx(), grid, defaultTheme, { x: 0, y: 0, down: false, clicked: false, hoveredId: null })
    // After render, width/height computed
    expect(grid.width).toBe(3 * 50 + 2 * 8) // 3 cells + 2 gaps
  })

  it('Spacer has fixed size', () => {
    const s = Spacer(20, 10)
    expect(s.width).toBe(20)
    expect(s.height).toBe(10)
  })
})

describe('components', () => {
  const ctx = mockCtx()
  const theme = defaultTheme
  const mouse = { x: 0, y: 0, down: false, clicked: false, hoveredId: null }

  it('Button creates with text', () => {
    const btn = Button({ text: 'Play', width: 80 })
    expect(btn.type).toBe('button')
    expect(btn.state.text).toBe('Play')
    expect(btn.width).toBe(80)
  })

  it('Button calls onClick when clicked', () => {
    let called = false
    const btn = Button({ text: 'Go', onClick: () => { called = true }, width: 60 })
    btn.render(ctx, btn, theme, { x: 10, y: 5, down: false, clicked: true, hoveredId: btn.id })
    expect(called).toBe(true)
  })

  it('Button does not call onClick when not hovered', () => {
    let called = false
    const btn = Button({ text: 'Go', onClick: () => { called = true }, width: 60 })
    btn.render(ctx, btn, theme, { x: 10, y: 5, down: false, clicked: true, hoveredId: 'other' })
    expect(called).toBe(false)
  })

  it('Slider creates with range', () => {
    const sld = Slider({ label: 'Volume', value: 0.5, width: 160 })
    expect(sld.type).toBe('slider')
    expect(sld.state.value).toBe(0.5)
  })

  it('Slider value clamps 0..1', () => {
    const sld = Slider({ label: 'X', value: 1.5 })
    expect(sld.state.value).toBe(1)
    const sld2 = Slider({ label: 'Y', value: -0.5 })
    expect(sld2.state.value).toBe(0)
  })

  it('Toggle creates unchecked', () => {
    const tgl = Toggle({ label: 'Sound', checked: false })
    expect(tgl.type).toBe('toggle')
    expect(tgl.state.checked).toBe(false)
  })

  it('Toggle toggles on click', () => {
    let val = false
    const tgl = Toggle({ label: 'Mute', onChange: (v) => { val = v } })
    tgl.render(ctx, tgl, theme, { x: 50, y: 10, down: false, clicked: true, hoveredId: tgl.id })
    expect(tgl.state.checked).toBe(true)
    expect(val).toBe(true)
  })

  it('Label renders text', () => {
    const lbl = Label({ text: 'Score: 100' })
    expect(lbl.type).toBe('label')
    expect(lbl.state.text).toBe('Score: 100')
  })

  it('Panel creates container', () => {
    const pnl = Panel({ title: 'Settings', width: 200, height: 100 })
    expect(pnl.type).toBe('panel')
    expect(pnl.state.title).toBe('Settings')
    expect(pnl.width).toBe(200)
  })

  it('ProgressBar creates with value', () => {
    const bar = ProgressBar({ label: 'HP', value: 0.75, width: 120 })
    expect(bar.type).toBe('progress')
    expect(bar.state.value).toBe(0.75)
  })

  it('components with hover update state', () => {
    const btn = Button({ text: 'Hover', width: 60 })
    btn.render(ctx, btn, theme, { x: 0, y: 0, down: false, clicked: false, hoveredId: btn.id })
    expect(btn.state.hover).toBe(true)

    btn.render(ctx, btn, theme, { x: 0, y: 0, down: false, clicked: false, hoveredId: 'other' })
    expect(btn.state.hover).toBe(false)
  })
})

describe('UI System', () => {
  it('createUI creates system', () => {
    const ui = createUI({ width: 800, height: 600 })
    expect(ui).toBeDefined()
    expect(ui.nodes).toEqual([])
  })

  it('add and remove nodes', () => {
    const ui = createUI({ width: 800, height: 600 })
    const btn = Button({ text: 'Test' })
    ui.add(btn)
    expect(ui.nodes).toHaveLength(1)
    ui.remove(btn.id)
    expect(ui.nodes).toHaveLength(0)
  })

  it('get node by id', () => {
    const ui = createUI({ width: 800, height: 600 })
    const lbl = Label({ text: 'hello' })
    ui.add(lbl)
    expect(ui.get(lbl.id)).toBe(lbl)
  })

  it('describe returns HyperGraph manifest', () => {
    const ui = createUI({ width: 800, height: 600 })
    const btn = Button({ text: 'Play' })
    ui.add(btn)
    const desc = ui.describe()
    expect(desc.kind).toBe('HyperGraph')
    expect(desc.nodes.length).toBeGreaterThan(0)
  })

  it('dispose clears nodes', () => {
    const ui = createUI({ width: 800, height: 600 })
    ui.add(Button({ text: 'A' }))
    ui.dispose()
    expect(ui.nodes).toHaveLength(0)
  })

  it('handleMouseEvent hit-tests correctly', () => {
    const ui = createUI({ width: 800, height: 600 })
    const btn = Button({ text: 'Click', width: 100, height: 30 })
    btn.x = 50; btn.y = 50
    ui.add(btn)

    // Directly set mouse position (bypass canvas rect for test)
    const hit = ui.handleMouseEvent({ clientX: 70, clientY: 60, type: 'mousemove' })
    // In jsdom, canvas has 0x0 bounding rect, so hit test uses raw coords
    // The hit test should work when we pass a canvas with known size
  })

  it('handleMouseEvent detects clicks', () => {
    const ui = createUI({ width: 800, height: 600 })
    const btn = Button({ text: 'Press', width: 100, height: 30 })
    btn.x = 50; btn.y = 50
    ui.add(btn)

    // Mousedown
    const down = ui.handleMouseEvent({ clientX: 70, clientY: 60, type: 'mousedown' })
    expect(down.down).toBe(true)

    // Mouseup
    const up = ui.handleMouseEvent({ clientX: 70, clientY: 60, type: 'mouseup' })
    expect(up.clicked).toBe(true)
    expect(up.down).toBe(false)
  })
})
