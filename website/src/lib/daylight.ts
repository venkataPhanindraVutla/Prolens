import { lightPhase, sunPosition, sunTimes, type LightPhase, type SunTimes } from './suncalc'
import { formatTime, noonIn } from './time'
import type { Place } from './location'

const DAY = 86_400_000

export interface Daylight {
  times: SunTimes
  dayStart: number
  /** Phase every 10 minutes across the local day, for drawing timelines and dials. */
  phases: LightPhase[]
  noonAltitude: number
  minAltitude: number
  maxAltitude: number
}

export function daylight(place: Place, now: number): Daylight {
  const noon = noonIn(place.tz, now)
  const times = sunTimes(noon, place.lat, place.lon)
  const dayStart = noon - DAY / 2
  const altitudes = Array.from({ length: 144 }, (_, i) => sunPosition(dayStart + i * 600_000 + 300_000, place.lat, place.lon).altitude)
  return {
    times,
    dayStart,
    phases: altitudes.map(lightPhase),
    noonAltitude: sunPosition(times.solarNoon, place.lat, place.lon).altitude,
    minAltitude: Math.min(...altitudes),
    maxAltitude: Math.max(...altitudes),
  }
}

/** Sun altitude edges of each band, in degrees. */
const BANDS = { golden: [-4, 6], blue: [-6, -4] } as const

/**
 * "18:02–18:40" on an ordinary day. Near the poles a band can start and never end, end without having started,
 * or never happen; the text says which, so it always agrees with the timeline.
 */
export function bandText(d: Daylight, start: number | null, end: number | null, tz: string, band: keyof typeof BANDS = 'golden'): string {
  if (start !== null && end !== null) return `${formatTime(start, tz)}–${formatTime(end, tz)}`
  if (start !== null) return `${formatTime(start, tz)} onwards`
  if (end !== null) return `until ${formatTime(end, tz)}`
  const [lo, hi] = BANDS[band]
  if (d.maxAltitude < lo) return 'Sun stays too low today'
  if (d.minAltitude > hi) return 'Sun stays too high today'
  return 'All day'
}

/** Sunrise to sunset, or whether the sun stays down or up all day. */
export function sunText(d: Daylight, tz: string): string {
  const { sunrise, sunset } = d.times
  if (sunrise !== null && sunset !== null) return `${formatTime(sunrise, tz)}–${formatTime(sunset, tz)}`
  return d.noonAltitude <= -0.833 ? 'Sun stays down today' : 'Sun stays up today'
}

export const PHASE_COLORS: Record<LightPhase, string> = {
  Night: '#0f0f14',
  Astro: '#161a2e',
  Nautical: '#1f2a52',
  Blue: '#3557b8',
  Golden: '#f2a33a',
  Day: '#e9e6d6',
}

/** A hard-stopped CSS gradient of the day's phases, left to right. */
export function phaseGradient(phases: LightPhase[], direction = '90deg'): string {
  const n = phases.length
  const stops = phases.map((p, i) => `${PHASE_COLORS[p]} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
  return `linear-gradient(${direction}, ${stops.join(', ')})`
}

export const dayFraction = (d: Daylight, t: number) => Math.max(0, Math.min(1, (t - d.dayStart) / DAY))
