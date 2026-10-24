import { useState } from 'react'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { gridSpec } from '../../lib/grids'
import type { Chapter } from './chapter'
import css from './story.module.css'
import vf from './Viewfinder.module.css'

const CHIPS = ['thirds', 'phi', 'spiral', 'triangles', 'dynamic', 'onePoint']
const SIZES = '(min-width: 980px) 56vw, 100vw'

export function useCompose(): Chapter {
  const [grid, setGrid] = useState('thirds')
  const spec = gridSpec(grid)!
  return {
    id: 'compose',
    photoId: 'compose',
    hud: `PHOTO · GRID ${spec.name.toUpperCase()} · 24 mm · f/11 · 1/45 · ISO 200`,
    title: (
      <>
        Compose on <span className="pink">23 grids</span>.
      </>
    ),
    body: 'Thirds is only the start. Golden spirals, triangles, dynamic symmetry and perspective grids sit over the live view, so the frame is built before you press the shutter.',
    screen: (f) => (
      <>
        <Photo id="compose" sizes={SIZES} />
        <GridOverlay id={grid} width={f.w} height={f.h} color="rgb(244 244 239 / 0.95)" />
        <span className={`${vf.tag} mono`}>{spec.name}</span>
      </>
    ),
    controls: (
      <>
        <div className={css.chips} role="radiogroup" aria-label="Grid">
          {CHIPS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={grid === id}
              className={`${css.chip} focusable`}
              onClick={() => setGrid(id)}
            >
              {gridSpec(id)!.name}
            </button>
          ))}
        </div>
        <p className={css.note} aria-live="polite">
          {spec.desc}
        </p>
      </>
    ),
  }
}
