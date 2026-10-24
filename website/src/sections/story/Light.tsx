import { useEffect, useState } from 'react'
import { AppLightScreen } from '../../app-ui/AppScreens'
import { CITIES } from '../../lib/cities'
import { bandText, dayFraction, daylight, phaseGradient, sunText } from '../../lib/daylight'
import { appGradient, coordText, dateText } from '../../lib/lightView'
import { useLocation } from '../../lib/location'
import { lightPhase, sunPosition } from '../../lib/suncalc'
import { useNow } from '../../lib/time'
import type { Chapter } from './chapter'
import css from './story.module.css'
import lt from './Light.module.css'

const PHASE_NAMES = { Night: 'Night', Astro: 'Astronomical twilight', Nautical: 'Nautical twilight', Blue: 'Blue hour', Golden: 'Golden hour', Day: 'Daylight' }

export function useLight(): Chapter {
  const { place, setCity, locate } = useLocation()
  const [status, setStatus] = useState<string | null>(null)
  const clock = useNow()
  const now = clock ?? 0
  const d = daylight(place, now)
  const t = d.times
  const phaseNow = lightPhase(sunPosition(now, place.lat, place.lon).altitude)
  const ready = clock !== null
  // Decided after mount: the pre-rendered page can't know whether this browser offers location.
  const [canLocate, setCanLocate] = useState(false)
  useEffect(() => setCanLocate('geolocation' in navigator), [])
  const isCity = CITIES.some((c) => c.name === place.name)

  const useMine = async () => {
    setStatus('Finding you…')
    const r = await locate()
    setStatus(r === 'ok' ? null : r === 'denied' ? 'Location is off, so pick a city instead.' : 'Couldn’t get your location. Pick a city instead.')
  }

  const show = (text: () => string) => (ready ? text() : '—')
  const bands = [
    { label: 'Sunrise to sunset', text: show(() => sunText(d, place.tz)) },
    { label: 'Morning blue hour', text: show(() => bandText(d, t.blueMorningStart, t.blueMorningEnd, place.tz, 'blue')) },
    { label: 'Morning golden hour', text: show(() => bandText(d, t.goldenMorningStart, t.goldenMorningEnd, place.tz)) },
    { label: 'Evening golden hour', text: show(() => bandText(d, t.goldenEveningStart, t.goldenEveningEnd, place.tz)) },
    { label: 'Evening blue hour', text: show(() => bandText(d, t.blueEveningStart, t.blueEveningEnd, place.tz, 'blue')) },
  ]

  return {
    id: 'light',
    statusBar: true,
    title: (
      <>
        Know when the <span className="pink">light is good</span>.
      </>
    ),
    body: 'Golden and blue hour for wherever you’re standing, worked out with no signal.',
    phone: (
      <AppLightScreen
        place={place.name}
        coords={coordText(place.lat, place.lon)}
        date={ready ? dateText(now, place.tz) : '—'}
        phase={ready ? PHASE_NAMES[phaseNow] : 'Reading the sky'}
        next={ready ? `Times in ${place.name} time` : ' '}
        timeline={ready ? appGradient(d) : undefined}
        rows={[
          ['Blue hour morning', show(() => bandText(d, t.blueMorningStart, t.blueMorningEnd, place.tz, 'blue'))],
          ['Golden hour morning', show(() => bandText(d, t.goldenMorningStart, t.goldenMorningEnd, place.tz))],
          ['Sunrise to sunset', show(() => sunText(d, place.tz))],
          ['Golden hour evening', show(() => bandText(d, t.goldenEveningStart, t.goldenEveningEnd, place.tz))],
          ['Blue hour evening', show(() => bandText(d, t.blueEveningStart, t.blueEveningEnd, place.tz, 'blue'))],
        ]}
      />
    ),
    controls: (
      <div className={lt.controls}>
        <div className={lt.where}>
          {canLocate && (
            <button type="button" className={`${css.chip} focusable`} onClick={useMine}>
              Use my location
            </button>
          )}
          <label className={lt.city}>
            <span>City</span>
            <select value={isCity ? place.name : ''} onChange={(e) => setCity(e.target.value)} className="focusable">
              {!isCity && <option value="">{place.name}</option>}
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {status && (
          <p className={lt.status} role="status">
            {status}
          </p>
        )}
        <div className={lt.timeline} aria-hidden="true">
          <div className={lt.bar} style={{ background: ready ? phaseGradient(d.phases) : 'var(--grey-2)' }}>
            {ready && <span className={lt.now} style={{ left: `${dayFraction(d, now) * 100}%` }} />}
          </div>
          <div className={`${lt.hours} mono`}>
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </div>
        <ul className={lt.bands}>
          {bands.map((b) => (
            <li key={b.label}>
              <span>{b.label}</span> <b className="mono">{b.text}</b>
            </li>
          ))}
        </ul>
        <p className={lt.credit}>Sun times from SunCalc by Vladimir Agafonkin (BSD-2).</p>
      </div>
    ),
  }
}
