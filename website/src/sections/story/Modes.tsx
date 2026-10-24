import { useState } from 'react'
import AppViewfinder, { type HudCell } from '../../app-ui/AppViewfinder'
import Photo from '../../components/Photo'
import { aperture, shutter } from '../../lib/format'
import { photo, type Photo as PhotoData } from '../../lib/photos'
import type { Chapter } from './chapter'
import css from './story.module.css'
import md from './Modes.module.css'

/** The app's mode strip, in strip order (core/model/Modes.kt), each shown with a real photograph of its kind. */
export const MODES: { label: string; photo: string; caption: string; zoom: number }[] = [
  { label: 'Night', photo: 'night', caption: 'Uses the phone’s own night mode, or takes a Prolens long exposure when there isn’t one.', zoom: 1 },
  { label: 'Micro', photo: 'micro', caption: 'Goes in past macro on the closest-focusing lens: droplets, fabric, print.', zoom: 5 },
  { label: 'Macro', photo: 'macro', caption: 'Switches to the lens that focuses closest, turns peaking on, and can stack focus when the phone allows manual focus.', zoom: 2 },
  { label: 'Photo', photo: 'hero', caption: 'Auto or full manual: ISO, shutter, focus and white balance, with grids, level and exposure tools on top.', zoom: 1 },
  { label: 'Slo-mo', photo: 'slomo', caption: 'Shows up only when the phone can record high frame rates, at the rates it really supports.', zoom: 2 },
  { label: 'Pano', photo: 'pano', caption: 'Sweep across the scene and Prolens stitches the frames on the phone.', zoom: 0.6 },
  { label: 'Templates', photo: 'templates', caption: 'Shot recipes with guide shapes for portraits, products, street and architecture, ready to line up.', zoom: 1 },
]

const num = (v: string | number | null | undefined) => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v
  const [a, b] = v.split('/').map(Number)
  return b ? a / b : a
}

/** The HUD as the app would show it for this photo's real settings, all set by hand. */
function hudFor(p: PhotoData): HudCell[] {
  const e = p.exif
  const n = num(e.FNumber)
  const t = num(e.ExposureTime)
  const f = num(e.FocalLengthIn35mmFilm) ?? num(e.FocalLength)
  return [
    { label: 'ISO', value: e.ISOSpeedRatings ? String(e.ISOSpeedRatings) : '125A', auto: !e.ISOSpeedRatings },
    { label: 'Shutter', value: t ? shutter(t) : '1/120A', auto: !t },
    { label: 'Aperture', value: n ? aperture(n) : 'f/1.8', plain: true },
    { label: 'Lens', value: f ? `${Math.round(f)} mm` : '24 mm', plain: true },
    { label: 'WB', value: 'AWB', auto: true },
    { label: 'EV', value: '0.0' },
    { label: 'Focus', value: 'AF', auto: true },
  ]
}

export function useModes(): Chapter {
  const [mode, setMode] = useState(3)
  const m = MODES[mode]
  return {
    id: 'modes',
    photoId: m.photo,
    title: (
      <>
        A mode for <span className="pink">every shot</span>.
      </>
    ),
    body: 'Night, close-up, slow motion, panoramas and shot templates live in one strip above the shutter. Swipe it, like the app.',
    phone: (
      <AppViewfinder
        preview={
          <div key={m.photo} className={md.swap}>
            <Photo id={m.photo} sizes="360px" />
            {m.label === 'Pano' && <div className={md.pano} aria-hidden="true" />}
          </div>
        }
        mode={m.label}
        hud={hudFor(photo(m.photo))}
        histogram={null}
        tools={{ histogram: false, grid: m.label !== 'Night' }}
        zoom={{ presets: [0.6, 1, 2, 5], active: m.zoom }}
      />
    ),
    controls: (
      <>
        <div className={css.chips} role="radiogroup" aria-label="Mode">
          {MODES.map((x, i) => (
            <button key={x.label} type="button" role="radio" aria-checked={i === mode} className={`${css.chip} focusable`} onClick={() => setMode(i)}>
              {x.label}
            </button>
          ))}
        </div>
        <p className={css.note} aria-live="polite">
          {m.caption}
        </p>
      </>
    ),
  }
}
