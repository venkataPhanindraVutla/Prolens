import { bandText, sunText, type Daylight } from './daylight'

export const coordText = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`

export const dateText = (ms: number, tz: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(ms)

/** The app's own chart colours (features/light/LightCharts.kt). */
const APP_PHASE: Record<string, string> = { Night: '#0c0c0e', Astro: '#1f1f23', Nautical: '#3f3f46', Blue: '#2c4a7a', Golden: '#8a6a2a', Day: '#d4d4d8' }

export function appGradient(d: Daylight): string {
  const n = d.phases.length
  return `linear-gradient(90deg, ${d.phases.map((p, i) => `${APP_PHASE[p]} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`).join(', ')})`
}

/** The Light tab's timeline rows for a day. */
export function lightRows(d: Daylight, tz: string): [string, string][] {
  const t = d.times
  return [
    ['Blue hour morning', bandText(d, t.blueMorningStart, t.blueMorningEnd, tz, 'blue')],
    ['Golden hour morning', bandText(d, t.goldenMorningStart, t.goldenMorningEnd, tz)],
    ['Sunrise to sunset', sunText(d, tz)],
    ['Golden hour evening', bandText(d, t.goldenEveningStart, t.goldenEveningEnd, tz)],
    ['Blue hour evening', bandText(d, t.blueEveningStart, t.blueEveningEnd, tz, 'blue')],
  ]
}

export const PHASE_NAMES = { Night: 'Night', Astro: 'Astronomical twilight', Nautical: 'Nautical twilight', Blue: 'Blue hour', Golden: 'Golden hour', Day: 'Daylight' }
