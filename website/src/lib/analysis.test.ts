import { expect, test } from 'vitest'
import { falseColor, histogram, luma, peaking, zebra } from './analysis'

const frame = (w: number, h: number, f: (x: number, y: number) => number) =>
  Uint8Array.from({ length: w * h }, (_, i) => f(i % w, Math.floor(i / w)))
const alphaAt = (rgba: Uint8ClampedArray, w: number, x: number, y: number) => rgba[(y * w + x) * 4 + 3]

test('luma uses Rec.601 weights', () => {
  expect(Array.from(luma(Uint8ClampedArray.from([255, 0, 0, 255, 255, 255, 255, 255])))).toEqual([76, 255])
})

test('histogram puts white in the top bin and black in the bottom', () => {
  expect(histogram(frame(4, 4, () => 255))[63]).toBe(16)
  expect(histogram(frame(4, 4, () => 0))[0]).toBe(16)
  expect(histogram(frame(4, 4, () => 0))).toHaveLength(64)
})

test('false colour follows the app’s exposure key', () => {
  expect(falseColor(0)).toEqual([124, 58, 237])
  expect(falseColor(255)).toEqual([239, 68, 68])
  expect(falseColor(128)).toEqual([102, 102, 102])
})

test('zebras stripe only pixels at or over the level', () => {
  const bright = zebra(frame(6, 6, () => 250), 6, 6)
  expect(alphaAt(bright, 6, 0, 0)).toBe(204)
  expect(alphaAt(bright, 6, 3, 0)).toBe(0)
  expect(zebra(frame(6, 6, () => 200), 6, 6).some((v, i) => i % 4 === 3 && v > 0)).toBe(false)
})

test('peaking marks a hard edge and nothing on a flat frame', () => {
  const edge = peaking(frame(10, 10, (x) => (x < 5 ? 0 : 255)), 10, 10)
  for (let y = 1; y < 9; y++) expect(Math.max(alphaAt(edge, 10, 4, y), alphaAt(edge, 10, 5, y))).toBe(235)
  expect(peaking(frame(10, 10, () => 128), 10, 10).every((v) => v === 0)).toBe(true)
})
