import { useEffect, useState } from 'react'
import Scene from '../../components/Scene'
import { CITIES } from '../../lib/cities'
import { bandText, dayFraction, daylight, phaseGradient } from '../../lib/daylight'
import { useLocation } from '../../lib/location'
import { lightPhase, sunPosition } from '../../lib/suncalc'
import { formatTime, useNow } from '../../lib/time'
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

  const bands = [
    { label: 'Morning golden hour', text: ready ? bandText(d, t.goldenMorningStart, t.goldenMorningEnd, place.tz) : '—' },
    { label: 'Evening golden hour', text: ready ? bandText(d, t.goldenEveningStart, t.goldenEveningEnd, place.tz) : '—' },
    { label: 'Evening blue hour', text: ready ? bandText(d, t.blueEveningStart, t.blueEveningEnd, place.tz) : '—' },
  ]

  return {
    id: 'light',
    title: (
      <>
        Know when the <span className="pink">light is good</span>.
      </>
    ),
    body: 'Golden hour, blue hour and the sun’s path for wherever you’re standing, worked out on the phone with no signal needed.',
    screen: (
      <>
        <Scene kind="golden-coast" />
        {ready && (
          <>
            <span className={`${css.screenTag} mono`}>
              {PHASE_NAMES[phaseNow]} · {formatTime(now, place.tz)}
            </span>
            <div className={lt.screenBar} style={{ background: phaseGradient(d.phases) }} aria-hidden="true">
              <span style={{ left: `${dayFraction(d, now) * 100}%` }} />
            </div>
          </>
        )}
      </>
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
