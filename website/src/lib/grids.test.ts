import { expect, test } from 'vitest'
import { GRIDS, gridShapes } from './grids'

test('all 23 grids draw something and have unique ids', () => {
  expect(GRIDS).toHaveLength(23)
  expect(new Set(GRIDS.map((g) => g.id)).size).toBe(23)
  for (const g of GRIDS) expect(gridShapes(g.id, 300, 400).length, g.id).toBeGreaterThan(0)
})

test('thirds has four lines and four power points', () => {
  const s = gridShapes('thirds', 300, 600)
  expect(s.filter((x) => x.kind === 'line')).toHaveLength(4)
  expect(s.filter((x) => x.kind === 'circle')).toHaveLength(4)
  expect(s.some((x) => x.kind === 'line' && Math.abs(x.x1 - 100) < 0.01 && x.x1 === x.x2)).toBe(true)
})

test('dynamic symmetry reciprocal lands at W − H²/W', () => {
  const w = 300
  const h = 200
  const r = gridShapes('dynamic', w, h).find((s) => s.kind === 'line' && s.x1 === w && s.y1 === 0 && s.x2 !== 0)
  expect(r?.kind).toBe('line')
  if (r?.kind !== 'line') return
  expect(r.x2).toBeCloseTo(w - (h * h) / w, 2)
  expect(r.y2).toBeCloseTo(h, 2)
})

test('unknown ids draw nothing', () => {
  expect(gridShapes('none', 300, 400)).toEqual([])
})
