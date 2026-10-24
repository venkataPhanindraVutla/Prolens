import { useState } from 'react'
import Hud from '../../components/Hud'
import { aperture as fmtAperture, distance } from '../../lib/format'
import { APERTURES, SENSORS, coc, cropFactor, dof } from '../../lib/photomath'
import tk from './Toolkit.module.css'

const D_MIN = 300
const D_MAX = 30_000
const STEPS = 1000
/** Distance slider is logarithmic: equal travel, equal ratio. */
const toMm = (v: number) => D_MIN * (D_MAX / D_MIN) ** (v / STEPS)
const fromMm = (mm: number) => Math.round((Math.log(mm / D_MIN) / Math.log(D_MAX / D_MIN)) * STEPS)
/** Position on the 0.3 m to ∞ bar, in percent. */
const pos = (mm: number) => (Number.isFinite(mm) ? Math.max(0, Math.min(100, (Math.log(mm / D_MIN) / Math.log((D_MAX * 3) / D_MIN)) * 100)) : 100)

export default function DofCalc() {
  const [sensorId, setSensorId] = useState('ff')
  const [focal, setFocal] = useState(50)
  const [ai, setAi] = useState(APERTURES.indexOf(8))
  const [dv, setDv] = useState(fromMm(3000))
  const sensor = SENSORS.find((s) => s.id === sensorId)!
  const n = APERTURES[ai]
  const s = toMm(dv)
  const d = dof(focal, n, coc(sensor), s)
  const crop = cropFactor(sensor)

  return (
    <div className={tk.tool}>
      <h3 className={tk.title}>Depth of field</h3>
      <label className={tk.field}>
        <span>Sensor</span>
        <select value={sensorId} onChange={(e) => setSensorId(e.target.value)} className="focusable">
          {SENSORS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <label className={tk.range}>
        <span>
          Focal length <b className="mono">{focal} mm{crop > 1.05 ? ` (${Math.round(focal * crop)} mm equiv.)` : ''}</b>
        </span>
        <input type="range" min={4} max={200} value={focal} onChange={(e) => setFocal(Number(e.target.value))} />
      </label>
      <label className={tk.range}>
        <span>
          Aperture <b className="mono">{fmtAperture(n)}</b>
        </span>
        <input type="range" min={0} max={APERTURES.length - 1} value={ai} onChange={(e) => setAi(Number(e.target.value))} />
      </label>
      <label className={tk.range}>
        <span>
          Focus distance <b className="mono">{distance(s)}</b>
        </span>
        <input type="range" min={0} max={STEPS} value={dv} onChange={(e) => setDv(Number(e.target.value))} />
      </label>
      <div className={tk.zone} aria-hidden="true">
        <span className={tk.sharp} style={{ left: `${pos(d.near)}%`, right: `${100 - pos(d.far)}%` }} />
        <span className={tk.subject} style={{ left: `${pos(s)}%` }} />
      </div>
      <Hud
        live
        items={[
          { label: 'Near', value: distance(d.near) },
          { label: 'Far', value: distance(d.far) },
          { label: 'Total', value: distance(d.total) },
          { label: 'Hyperfocal', value: distance(d.hyperfocal) },
        ]}
      />
    </div>
  )
}
