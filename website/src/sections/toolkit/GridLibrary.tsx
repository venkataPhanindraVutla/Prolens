import { useState } from 'react'
import GridOverlay from '../../components/GridOverlay'
import Scene from '../../components/Scene'
import { GRIDS, GRID_GROUPS, gridSpec } from '../../lib/grids'
import tk from './Toolkit.module.css'

export default function GridLibrary() {
  const [id, setId] = useState('spiral')
  const spec = gridSpec(id)!
  return (
    <div className={`${tk.tool} ${tk.library}`}>
      <div className={tk.frame}>
        <Scene kind="golden-coast" />
        <GridOverlay id={id} width={600} height={400} />
      </div>
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
