import { useState } from 'react'
import CropMarks from '../components/CropMarks'
import SectionHeading from '../components/SectionHeading'
import { PROFILES, modesFor, type Lens } from '../lib/profiles'
import css from './EveryPhone.module.css'

const lensLabel = (l: Lens) => (l.role === 'Front' ? 'Front' : `${l.role} · ${l.zoom}×`)
const lensDetail = (l: Lens) => `${l.mm} mm · ${l.mp} MP · ${l.focusFromCm ? `focus from ${l.focusFromCm} cm` : 'fixed focus'}`

export default function EveryPhone() {
  const [id, setId] = useState(PROFILES[2].id)
  const p = PROFILES.find((x) => x.id === id)!
  const rows: [string, string][] = [
    ['Manual exposure', p.manual ? 'Yes' : 'No'],
    ['Night', p.night === 'phone' ? 'Phone’s night mode' : 'Prolens long exposure'],
    ['Slo-mo', p.sloMoFps.length ? p.sloMoFps.map((f) => `${f}`).join(' · ') + ' fps' : 'Not available'],
    ['Portrait blur', p.portraitBlur ? 'Available' : 'Not available'],
  ]
  return (
    <section className={`section ${css.every}`} aria-labelledby="every-title">
      <div className={css.intro}>
        <SectionHeading id="every-title" className="display">
          Built for <span className="pink">every</span> phone.
        </SectionHeading>
        <p className="lede">
          Prolens asks each phone what its cameras can really do, then shows only that: the lenses apps are allowed to
          use, the closest focus, the slow-motion frame rates, and whether Night uses the phone’s own mode or Prolens’.
        </p>
        <div className={css.switch} role="radiogroup" aria-label="Phone">
          {PROFILES.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === id} className="focusable" onClick={() => setId(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      </div>

      <div className={css.card} aria-live="polite">
        <CropMarks />
        <h3>This phone</h3>
        <p className={css.desc}>Lenses and modes Prolens can use here. Other phones show their own.</p>
        <ul className={css.rows}>
          {p.lenses.map((l) => (
            <li key={l.role}>
              <span>{lensLabel(l)}</span>
              <span className="mono">{lensDetail(l)}</span>
            </li>
          ))}
          {rows.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <span className="mono">{v}</span>
            </li>
          ))}
        </ul>
        {p.note && <p className={css.note}>{p.note}</p>}
        <div className={`${css.modes} mono`}>
          {modesFor(p).map((m) => (
            <span key={m} className={m === 'Photo' ? css.current : ''}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
