import { expect, test } from 'vitest'
import { focusBand } from './focusband'

test('everything from the subject to infinity is sharp past the hyperfocal distance', () => {
  const b = focusBand(2000, Infinity)
  expect(b.top).toBe(0)
  expect(b.bottom).toBeGreaterThan(80)
})

test('a short depth of field is a thin band near the horizon for far subjects', () => {
  const b = focusBand(9000, 11000)
  expect(b.bottom - b.top).toBeLessThan(5)
  expect(b.top).toBeGreaterThan(42)
})

test('the band never leaves the frame', () => {
  const b = focusBand(300, 600)
  expect(b.bottom).toBeLessThanOrEqual(100)
  expect(b.top).toBeGreaterThanOrEqual(0)
})
