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
}

export function daylight(place: Place, now: number): Daylight {
  const noon = noonIn(place.tz, now)
  const times = sunTimes(noon, place.lat, place.lon)
  const dayStart = noon - DAY / 2
  const phases = Array.from({ length: 144 }, (_, i) => lightPhase(sunPosition(dayStart + i * 600_000 + 300_000, place.lat, place.lon).altitude))
  return { times, dayStart, phases, noonAltitude: sunPosition(times.solarNoon, place.lat, place.lon).altitude }
}

/** "18:02–18:40", or what the sun is doing instead when the band never happens today. */
export function bandText(d: Daylight, start: number | null, end: number | null, tz: string): string {
  if (start === null || end === null) return d.noonAltitude <= -0.833 ? 'Sun stays down today' : 'Sun stays up today'
  return `${formatTime(start, tz)}–${formatTime(end, tz)}`
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
