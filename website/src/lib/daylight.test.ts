import { expect, test } from 'vitest'
import { bandText, daylight, sunText } from './daylight'
import type { Place } from './location'
import { CITIES } from './cities'

const city = (name: string) => CITIES.find((c) => c.name === name)! as Place
const at = (place: Place, utc: number) => daylight(place, utc)

test('a short polar winter day is not called "Sun stays up"', () => {
  const r = city('Reykjavík')
  const d = at(r, Date.UTC(2026, 11, 21, 12))
  const t = d.times
  expect(sunText(d, r.tz)).toMatch(/^\d\d:\d\d–\d\d:\d\d$/)
  for (const s of [bandText(d, t.goldenMorningStart, t.goldenMorningEnd, r.tz), bandText(d, t.goldenEveningStart, t.goldenEveningEnd, r.tz)])
    expect(s).not.toMatch(/stays (up|down)/)
})

test('a midsummer night that never gets dark says how the light runs', () => {
  const r = city('Reykjavík')
  const d = at(r, Date.UTC(2026, 5, 21, 12))
  const t = d.times
  expect(sunText(d, r.tz)).toMatch(/^\d\d:\d\d–\d\d:\d\d$/)
  const evening = bandText(d, t.goldenEveningStart, t.goldenEveningEnd, r.tz)
  expect(evening).toMatch(/^\d\d:\d\d onwards$/)
  expect(bandText(d, t.blueEveningStart, t.blueEveningEnd, r.tz, 'blue')).toBe('Sun stays too high today')
})

test('polar night: the sun line says it stays down', () => {
  const tr = city('Tromsø')
  const d = at(tr, Date.UTC(2026, 11, 21, 12))
  expect(sunText(d, tr.tz)).toBe('Sun stays down today')
})

test('a normal day is a plain range', () => {
  const l = city('London')
  const d = at(l, Date.UTC(2026, 5, 21, 12))
  expect(bandText(d, d.times.goldenEveningStart, d.times.goldenEveningEnd, l.tz)).toMatch(/^\d\d:\d\d–\d\d:\d\d$/)
})
