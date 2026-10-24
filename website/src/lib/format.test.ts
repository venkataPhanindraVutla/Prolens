import { expect, test } from 'vitest'
import { aperture, distance, ev, shutter } from './format'

test('shutter speeds read like a camera', () => {
  expect(shutter(1 / 250)).toBe('1/250')
  expect(shutter(2)).toBe('2s')
  expect(shutter(0.5)).toBe('0.5s')
})

test('apertures drop trailing zeros', () => {
  expect(aperture(2.8)).toBe('f/2.8')
  expect(aperture(8)).toBe('f/8')
})

test('distances pick a unit and infinity has a symbol', () => {
  expect(distance(2360)).toBe('2.36 m')
  expect(distance(Infinity)).toBe('∞')
})

test('exposure value carries a sign', () => {
  expect(ev(0.3)).toBe('+0.3 EV')
})
