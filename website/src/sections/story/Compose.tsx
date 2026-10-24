import { useState } from 'react'
import AppViewfinder from '../../app-ui/AppViewfinder'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { gridSpec } from '../../lib/grids'
import { PREVIEW, type Chapter } from './chapter'
import css from './story.module.css'

/** Chip label to the grid drawn. The golden spiral is always drawn at its true 1.618 ratio, never stretched. */
const CHIPS: { id: string; label: string }[] = [
  { id: 'thirds', label: 'Rule of thirds' },
  { id: 'phi', label: 'Phi grid' },
  { id: 'spiralTrue', label: 'Golden spiral' },
  { id: 'triangles', label: 'Golden triangles' },
  { id: 'dynamic', label: 'Dynamic symmetry' },
  { id: 'onePoint', label: 'One-point perspective' },
]

export function useCompose(): Chapter {
  const [grid, setGrid] = useState('thirds')
  const spec = gridSpec(grid)!
  return {
    id: 'compose',
    photoId: 'compose',
    title: (
      <>
        Compose on <span className="pink">23 grids</span>.
      </>
    ),
    body: 'Thirds is only the start. Golden spirals, triangles, dynamic symmetry and perspective grids sit over the live view, so the frame is built before you press the shutter.',
    phone: (
      <AppViewfinder
        preview={<Photo id="compose" sizes="360px" />}
        overlay={<GridOverlay id={grid} width={PREVIEW.w} height={PREVIEW.h} variant="app" />}
        histogram={null}
        tools={{ histogram: false }}
      />
    ),
    controls: (
      <>
        <div className={css.chips} role="radiogroup" aria-label="Grid">
          {CHIPS.map((c) => (
            <button key={c.id} type="button" role="radio" aria-checked={grid === c.id} className={`${css.chip} focusable`} onClick={() => setGrid(c.id)}>
              {c.label}
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
