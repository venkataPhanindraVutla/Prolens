import { useState } from 'react'
import Photo from '../components/Photo'
import SectionHeading from '../components/SectionHeading'
import { creditLine, photo } from '../lib/photos'
import { PROFILES, modesFor, zoomScale, type Lens } from '../lib/profiles'
import css from './EveryPhone.module.css'

const PHOTO = photo('lenses')
const lensDetail = (l: Lens) => `${l.mm} mm · ${l.mp} MP · ${l.focusFromCm ? `focus from ${l.focusFromCm} cm` : 'fixed focus'}`
const zoomLabel = (z: number) => `${z}×`

export default function EveryPhone() {
  const [id, setId] = useState(PROFILES[2].id)
  const p = PROFILES.find((x) => x.id === id)!
  const back = p.lenses.filter((l) => l.role !== 'Front')
  const [zoom, setZoom] = useState(1)
  const widest = Math.min(...back.map((l) => l.zoom))
  const shown = back.some((l) => l.zoom === zoom) ? zoom : 1
  const lens = back.find((l) => l.zoom === shown)!
  const pick = (next: string) => {
    setId(next)
    setZoom(1)
  }
  const rows: [string, string][] = [
    ...p.lenses.map((l): [string, string] => [l.role === 'Front' ? 'Front' : `${l.role} · ${zoomLabel(l.zoom)}`, lensDetail(l)]),
    ['Manual exposure', p.manual ? 'Yes' : 'No'],
    ['Night', p.night === 'phone' ? 'Phone’s night mode' : 'Prolens long exposure'],
    ['Slo-mo', p.sloMoFps.length ? p.sloMoFps.join(' · ') + ' fps' : 'Not available'],
    ['Portrait blur', p.portraitBlur ? 'Available' : 'Not available'],
  ]

  return (
    <section className={`section ${css.every}`} aria-labelledby="every-title">
      <div className={css.head}>
        <SectionHeading id="every-title" className="display">
          Built for <span className="pink">every</span> phone.
        </SectionHeading>
        <p className="lede">
          Prolens asks each phone what its cameras can really do, then shows only that: the lenses apps may use, the
          closest focus, real slow-motion frame rates, and whose night mode runs.
        </p>
        <div className={css.switch} role="radiogroup" aria-label="Phone">
          {PROFILES.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === id} className="focusable" onClick={() => pick(x.id)}>
              {x.name}
            </button>
          ))}
        </div>
      </div>

      <figure className={css.view}>
        <div className={css.zoomBox}>
          <div data-zoom className={css.zoom} style={{ transform: `scale(${zoomScale(shown, widest)})`, transformOrigin: PHOTO.focus }}>
            <Photo id="lenses" sizes="(min-width: 980px) 60vw, 100vw" />
          </div>
          <div className={`${css.readout} mono`} aria-live="polite">
            {lens.role} · {lens.mm} mm equiv.
          </div>
          <div className={css.pills} role="radiogroup" aria-label="Lens">
            {back.map((l) => (
              <button
                key={l.zoom}
                type="button"
                role="radio"
                aria-checked={l.zoom === shown}
                className={`${css.pill} mono focusable`}
                onClick={() => setZoom(l.zoom)}
              >
                {zoomLabel(l.zoom)}
              </button>
            ))}
          </div>
        </div>
        <figcaption className="mono">
          {PHOTO.place} ·{' '}
          <a href={PHOTO.page} target="_blank" rel="noopener">
            Photo: {creditLine(PHOTO)}
          </a>
        </figcaption>
      </figure>

      <div className={css.card}>
        <h3>This phone</h3>
        <p className={css.desc}>Lenses and modes Prolens can use here. Other phones show their own.</p>
        <dl className={css.rows}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>
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
