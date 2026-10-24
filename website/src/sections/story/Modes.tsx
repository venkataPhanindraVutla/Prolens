import { useState } from 'react'
import Photo from '../../components/Photo'
import { exifLine, photo } from '../../lib/photos'
import type { Chapter } from './chapter'
import css from './story.module.css'
import vf from './Viewfinder.module.css'
import md from './Modes.module.css'

/** The app's mode strip, in strip order (core/model/Modes.kt), each shown with a real photograph of its kind. */
export const MODES: { label: string; photo: string; caption: string }[] = [
  { label: 'Night', photo: 'night', caption: 'Uses the phone’s own night mode, or takes a Prolens long exposure when there isn’t one.' },
  { label: 'Micro', photo: 'micro', caption: 'Goes in past macro on the closest-focusing lens: droplets, fabric, print.' },
  { label: 'Macro', photo: 'macro', caption: 'Switches to the lens that focuses closest, turns peaking on, and can stack focus when the phone allows manual focus.' },
  { label: 'Photo', photo: 'hero', caption: 'Auto or full manual: ISO, shutter, focus and white balance, with grids, level and exposure tools on top.' },
  { label: 'Slo-mo', photo: 'slomo', caption: 'Shows up only when the phone can record high frame rates, at the rates it really supports.' },
  { label: 'Pano', photo: 'pano', caption: 'Sweep across the scene and Prolens stitches the frames on the phone.' },
  { label: 'Templates', photo: 'templates', caption: 'Shot recipes with guide shapes for portraits, products, street and architecture, ready to line up.' },
]
const SIZES = '(min-width: 980px) 56vw, 100vw'

export function useModes(): Chapter {
  const [mode, setMode] = useState(3)
  const m = MODES[mode]
  const settings = exifLine(photo(m.photo)).split(' · ').slice(1).join(' · ')
  return {
    id: 'modes',
    photoId: m.photo,
    mode: m.label,
    hud: `${m.label.toUpperCase()} · ${settings}`,
    title: (
      <>
        A mode for <span className="pink">every shot</span>.
      </>
    ),
    body: 'Night, close-up, slow motion, panoramas and shot templates live in one strip beside the shutter, the way a camera does it.',
    screen: () => (
      <>
        <div key={m.photo} className={md.swap}>
          <Photo id={m.photo} sizes={SIZES} />
        </div>
        {m.label === 'Pano' && <div className={md.pano} aria-hidden="true" />}
        <span className={`${vf.tag} mono`}>{m.label}</span>
      </>
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
