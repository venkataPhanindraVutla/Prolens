import { useState } from 'react'
import Scene, { type SceneKind } from '../../components/Scene'
import type { Chapter } from './chapter'
import css from './story.module.css'
import md from './Modes.module.css'

/** The app's mode strip, in strip order (core/model/Modes.kt). */
export const MODES: { label: string; scene: SceneKind; caption: string }[] = [
  { label: 'Night', scene: 'city-night', caption: 'Uses the phone’s own night mode, or takes a Prolens long exposure when there isn’t one.' },
  { label: 'Micro', scene: 'texture-micro', caption: 'Goes in past macro on the closest-focusing lens: droplets, fabric, print.' },
  { label: 'Macro', scene: 'flower-macro', caption: 'Switches to the lens that focuses closest, turns peaking on, and can stack focus when the phone allows manual focus.' },
  { label: 'Photo', scene: 'golden-coast', caption: 'Auto or full manual: ISO, shutter, focus and white balance, with grids, level and exposure tools on top.' },
  { label: 'Slo-mo', scene: 'runner', caption: 'Shows up only when the phone can record high frame rates, at the rates it really supports.' },
  { label: 'Pano', scene: 'panorama', caption: 'Sweep across the scene and Prolens stitches the frames on the phone.' },
  { label: 'Templates', scene: 'portrait', caption: 'Shot recipes with guide shapes for portraits, products and street, ready to line up.' },
]

export function useModes(): Chapter {
  const [mode, setMode] = useState(3)
  const m = MODES[mode]
  return {
    id: 'modes',
    title: (
      <>
        A mode for <span className="pink">every shot</span>.
      </>
    ),
    body: 'Night, close-up, slow motion, panoramas and shot templates live in one strip above the shutter, the way a camera does it.',
    screen: (
      <>
        <Scene kind={m.scene} />
        <div className={`${md.strip} mono`} aria-hidden="true">
          {MODES.map((x, i) => (
            <span key={x.label} className={i === mode ? md.current : ''}>
              {x.label}
            </span>
          ))}
        </div>
        <span className={md.shutter} aria-hidden="true" />
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
