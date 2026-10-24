import { useState } from 'react'
import GridOverlay from '../../components/GridOverlay'
import Scene, { SCENE_H, SCENE_W } from '../../components/Scene'
import { gridSpec } from '../../lib/grids'
import type { Chapter } from './chapter'
import css from './story.module.css'

const CHIPS = ['thirds', 'phi', 'spiral', 'triangles', 'dynamic', 'onePoint']

export function useCompose(): Chapter {
  const [grid, setGrid] = useState('thirds')
  const spec = gridSpec(grid)!
  return {
    id: 'compose',
    title: (
      <>
        Compose on <span className="pink">23 grids</span>.
      </>
    ),
    body: 'Thirds is only the start. Golden spirals, triangles, dynamic symmetry and perspective grids sit over the live view, so the frame is built before you press the shutter.',
    screen: (
      <>
        <Scene kind="golden-coast" />
        <GridOverlay id={grid} width={SCENE_W} height={SCENE_H} />
        <span className={`${css.screenTag} mono`}>{spec.name}</span>
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
