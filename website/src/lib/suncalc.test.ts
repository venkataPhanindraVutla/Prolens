import { expect, test } from 'vitest'
import { lightPhase, sunPosition, sunTimes } from './suncalc'

/** 2026-06-21 12:00 UTC */
const midsummerNoonUtc = 1782043200000
const MIN = 60_000

test('London on midsummer: sunrise, sunset and the noon sun', () => {
  const t = sunTimes(midsummerNoonUtc, 51.5074, -0.1278)
  expect(Math.abs(t.sunrise! - (midsummerNoonUtc - 496 * MIN))).toBeLessThan(3 * MIN)
  expect(Math.abs(t.sunset! - (midsummerNoonUtc + 501 * MIN))).toBeLessThan(3 * MIN)
  const noon = sunPosition(t.solarNoon, 51.5074, -0.1278)
  expect(Math.abs(noon.altitude - 61.9)).toBeLessThan(0.3)
  expect(Math.abs(noon.azimuth - 180)).toBeLessThan(1.5)
})

test('polar days return null instead of a time', () => {
  expect(sunTimes(midsummerNoonUtc, 64.1466, -21.9426).astroDusk).toBeNull()
  const tromsoMidwinter = 1797854400000 // 2026-12-21 12:00 UTC
  expect(sunTimes(tromsoMidwinter, 69.65, 18.96).sunrise).toBeNull()
})

test('light phases by sun altitude', () => {
  expect(lightPhase(2)).toBe('Golden')
  expect(lightPhase(-5)).toBe('Blue')
  expect(lightPhase(-30)).toBe('Night')
})
