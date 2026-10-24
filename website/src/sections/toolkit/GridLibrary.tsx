import { useState } from 'react'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { creditLine, photo } from '../../lib/photos'
import { GRIDS, GRID_GROUPS, gridSpec } from '../../lib/grids'
import tk from './Toolkit.module.css'

const HERO = photo('hero')

export default function GridLibrary() {
  const [id, setId] = useState('spiralTrue')
  const spec = gridSpec(id)!
  return (
    <div className={`${tk.tool} ${tk.library}`} data-reveal="up">
      <figure className={tk.libraryPhoto}>
        <div className={tk.frame}>
          <Photo id="hero" sizes="(min-width: 980px) 50vw, 100vw" />
          <GridOverlay id={id} width={600} height={400} color="rgb(244 244 239 / 0.95)" />
        </div>
        <figcaption className="mono">
          {HERO.place} ·{' '}
          <a href={HERO.page} target="_blank" rel="noopener">
            Photo: {creditLine(HERO)}
          </a>
        </figcaption>
      </figure>
      <div className={tk.libraryText}>
        <h3 className={tk.title}>All 23 grids</h3>
        <div role="radiogroup" aria-label="Grid library" className={tk.groups}>
          {GRID_GROUPS.map((g) => (
            <div key={g.id} className={tk.group}>
              <span className={tk.groupLabel}>{g.label}</span>
              <div className={tk.chips}>
                {GRIDS.filter((x) => x.group === g.id).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={x.id === id}
                    className={`${tk.chip} focusable`}
                    onClick={() => setId(x.id)}
                  >
                    {x.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div aria-live="polite" className={tk.about}>
          <p>{spec.desc}</p>
          <p className={tk.best}>Best for: {spec.bestFor}</p>
        </div>
      </div>
    </div>
  )
}
