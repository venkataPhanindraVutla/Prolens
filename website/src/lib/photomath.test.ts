import { expect, test } from 'vitest'
import { APERTURES, SENSORS, coc, dof, hyperfocal, nearest } from './photomath'

const ff = SENSORS.find((s) => s.id === 'ff')!

test('full-frame circle of confusion', () => {
  expect(coc(ff)).toBeCloseTo(0.0288, 3)
})

test('depth of field for 50 mm at f/8 focused at 3 m', () => {
  const d = dof(50, 8, coc(ff), 3000)
  expect(Math.abs(d.near - 2360)).toBeLessThan(15)
  expect(Math.abs(d.far - 4120)).toBeLessThan(25)
  expect(Math.abs(d.hyperfocal / 1000 - 10.9)).toBeLessThan(0.05)
  expect(d.total).toBeCloseTo(d.far - d.near, 6)
})

test('far limit is infinite past the hyperfocal distance', () => {
  const c = coc(ff)
  expect(dof(24, 8, c, hyperfocal(24, 8, c) + 1).far).toBe(Infinity)
})

test('nearest aperture is judged in stops', () => {
  expect(nearest(APERTURES, 7.5)).toBe(7.1)
  expect(nearest(APERTURES, 7.7)).toBe(8)
})
