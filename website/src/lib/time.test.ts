import { expect, test } from 'vitest'
import { CITIES, cityForZone } from './cities'
import { formatTime, noonIn } from './time'

const now = Date.UTC(2026, 5, 21, 3)

test('noon is found in the place’s own zone', () => {
  expect(noonIn('Asia/Kolkata', now)).toBe(Date.UTC(2026, 5, 21, 6, 30))
  expect(noonIn('Europe/London', now)).toBe(Date.UTC(2026, 5, 21, 11))
})

test('noon uses the local calendar date, which can be yesterday', () => {
  expect(noonIn('America/Los_Angeles', now)).toBe(Date.UTC(2026, 5, 20, 19))
})

test('times are formatted in the given zone, 24-hour', () => {
  expect(formatTime(Date.UTC(2026, 5, 21, 3, 44), 'Europe/London')).toBe('04:44')
  expect(formatTime(Date.UTC(2026, 5, 21, 3, 44), 'Asia/Kolkata')).toBe('09:14')
})

test('a missing time is a dash, never Invalid Date', () => {
  expect(formatTime(null, 'Europe/London')).toBe('—')
})

test('a city is picked from the browser zone, London otherwise', () => {
  expect(cityForZone('Asia/Kolkata').name).toBe('Hyderabad')
  expect(cityForZone('Mars/Olympus').name).toBe('London')
  expect(CITIES).toHaveLength(9)
})
