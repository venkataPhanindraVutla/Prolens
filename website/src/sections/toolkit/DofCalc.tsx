import { useState } from 'react'
import Hud from '../../components/Hud'
import Photo from '../../components/Photo'
import { blurPx, focusBand, rowAt } from '../../lib/focusband'
import { aperture as fmtAperture, distance } from '../../lib/format'
import { APERTURES, SENSORS, coc, cropFactor, dof } from '../../lib/photomath'
import { creditLine, photo } from '../../lib/photos'
import tk from './Toolkit.module.css'

const D_MIN = 300
const D_MAX = 30_000
const STEPS = 1000
/** Distance slider is logarithmic: equal travel, equal ratio. */
const toMm = (v: number) => D_MIN * (D_MAX / D_MIN) ** (v / STEPS)
const fromMm = (mm: number) => Math.round((Math.log(mm / D_MIN) / Math.log(D_MAX / D_MIN)) * STEPS)
const PHOTO = photo('dof')
const SOFT = 3

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
  const band = focusBand(d.near, d.far)
  // The blurred copy is hidden across the sharp band, with soft edges, so the real photo shows through.
  const mask = `linear-gradient(to bottom, #000 0%, #000 ${Math.max(0, band.top - SOFT)}%, transparent ${band.top}%, transparent ${band.bottom}%, #000 ${Math.min(100, band.bottom + SOFT)}%, #000 100%)`

  return (
    <div className={`${tk.tool} ${tk.dof}`} data-reveal="up">
      <figure className={tk.dofPhoto}>
        <div className={tk.frame}>
          <Photo id="dof" sizes="(min-width: 980px) 55vw, 100vw" />
          <div
            data-blur
            data-top={band.top}
            data-bottom={band.bottom}
            className={tk.blurLayer}
            style={{ filter: `blur(${blurPx(focal * crop, n)}px)`, maskImage: mask, WebkitMaskImage: mask }}
          >
            <Photo id="dof" sizes="(min-width: 980px) 55vw, 100vw" decorative />
          </div>
          <span className={tk.subject} style={{ top: `${rowAt(s) * 100}%` }} aria-hidden="true">
            <b className="mono">{distance(s)}</b>
          </span>
        </div>
        <figcaption className="mono">
          {PHOTO.place} ·{' '}
          <a href={PHOTO.page} target="_blank" rel="noopener">
            Photo: {creditLine(PHOTO)}
          </a>
        </figcaption>
      </figure>

      <div className={tk.dofControls}>
        <h3 className={tk.title}>Depth of field</h3>
        <p className={tk.hint}>Focus down the road and open the aperture: everything outside the sharp zone goes soft.</p>
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
        <Hud
          live
          className={tk.results}
          items={[
            { label: 'Near', value: distance(d.near) },
            { label: 'Far', value: distance(d.far) },
            { label: 'Total', value: distance(d.total) },
            { label: 'Hyperfocal', value: distance(d.hyperfocal) },
          ]}
        />
      </div>
    </div>
  )
}
