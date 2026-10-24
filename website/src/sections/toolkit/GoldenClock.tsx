import { bandText, daylight, PHASE_COLORS } from '../../lib/daylight'
import { useLocation } from '../../lib/location'
import { lightPhase, sunPosition } from '../../lib/suncalc'
import { formatTime, useNow } from '../../lib/time'
import tk from './Toolkit.module.css'

const R = 100
const NAMES = { Night: 'Night', Astro: 'Astronomical twilight', Nautical: 'Nautical twilight', Blue: 'Blue hour', Golden: 'Golden hour', Day: 'Daylight' }

/** Midnight at the bottom, noon at the top, like the sun's own arc. */
const point = (frac: number, r: number) => {
  const a = (frac * 360 + 90) * (Math.PI / 180)
  return [120 + r * Math.cos(a), 120 + r * Math.sin(a)] as const
}

function arc(f0: number, f1: number, r: number) {
  const [x0, y0] = point(f0, r)
  const [x1, y1] = point(f1, r)
  return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`
}

export default function GoldenClock() {
  const { place } = useLocation()
  const clock = useNow()
  const now = clock ?? 0
  const ready = clock !== null
  const d = daylight(place, now)
  const n = d.phases.length
  const frac = Math.max(0, Math.min(1, (now - d.dayStart) / 86_400_000))
  const [hx, hy] = point(frac, R - 22)
  const phase = lightPhase(sunPosition(now, place.lat, place.lon).altitude)
  return (
    <div className={tk.tool}>
      <h3 className={tk.title}>Golden-hour clock</h3>
      <svg className={tk.clock} viewBox="0 0 240 240" role="img" aria-label={`24-hour light dial for ${place.name}`}>
        {ready ? (
          d.phases.map((p, i) => <path key={i} d={arc(i / n, (i + 1.02) / n, R)} stroke={PHASE_COLORS[p]} strokeWidth={18} fill="none" />)
        ) : (
          <circle cx={120} cy={120} r={R} stroke="var(--grey-2)" strokeWidth={18} fill="none" />
        )}
        {ready && <line x1={120} y1={120} x2={hx} y2={hy} stroke="var(--pink)" strokeWidth={2.5} strokeLinecap="round" />}
        <circle cx={120} cy={120} r={4} fill="var(--pink)" />
        <text x={120} y={44} textAnchor="middle" className={tk.dialLabel}>12</text>
        <text x={120} y={204} textAnchor="middle" className={tk.dialLabel}>00</text>
      </svg>
      <p className={tk.clockNow}>
        <b>{ready ? NAMES[phase] : 'Reading the sky'}</b> in {place.name} · <span className="mono">{ready ? formatTime(now, place.tz) : '—'}</span>
      </p>
      <p className={`${tk.best} mono`}>
        Evening golden hour {ready ? bandText(d, d.times.goldenEveningStart, d.times.goldenEveningEnd, place.tz) : '—'}
      </p>
    </div>
  )
}
