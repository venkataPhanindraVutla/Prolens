import { useState, type ReactElement } from 'react'
import SectionHeading from '../../components/SectionHeading'
import { useMedia } from '../../lib/motion'
import DofCalc from './DofCalc'
import GoldenClock from './GoldenClock'
import GridLibrary from './GridLibrary'
import tk from './Toolkit.module.css'

/** The calculators the app carries beside these three, by what they answer. */
const MORE = [
  ['Exposure solver', 'Any two of aperture, shutter and ISO, and the third for a correct exposure.'],
  ['ND filters', 'Shutter time behind ND2 to ND32000, from 1 to 15 stops.'],
  ['Night sky', 'The 500 and NPF rules for star exposures without trails.'],
  ['Hand-held limit', 'The slowest safe shutter for your lens, with stabilisation.'],
  ['Flash range', 'How far a flash reaches from its guide number, aperture and ISO.'],
  ['Background blur', 'How soft the background goes behind a subject, as a share of the frame.'],
]

function More() {
  return (
    <div className={`${tk.tool} ${tk.more}`} data-reveal="up" data-reveal-delay={0.1}>
      <h3 className={tk.title}>Also in the app</h3>
      <dl>
        {MORE.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const TOOLS: [string, () => ReactElement][] = [
  ['Depth of field', DofCalc],
  ['Grids', GridLibrary],
  ['Golden hour', GoldenClock],
  ['More', More],
]

export default function Toolkit() {
  const phone = useMedia('(max-width: 760px)')
  const [tab, setTab] = useState(0)
  if (phone) {
    const Tool = TOOLS[tab][1]
    return (
      <section className={`section ${tk.toolkit}`} aria-labelledby="toolkit-title" data-stage>
        <SectionHeading id="toolkit-title" className="display">
          The toolkit, <span className="pink">live</span>.
        </SectionHeading>
        <p className="lede">The same maths the app runs, on real photographs.</p>
        <div className={tk.tabs} role="tablist" aria-label="Tools">
          {TOOLS.map(([name], i) => (
            <button key={name} type="button" role="tab" aria-selected={i === tab} className="focusable" onClick={() => setTab(i)}>
              {name}
            </button>
          ))}
        </div>
        <Tool />
      </section>
    )
  }
  return (
    <section className={`section ${tk.toolkit}`} aria-labelledby="toolkit-title" data-stage>
      <SectionHeading id="toolkit-title" className="display">
        The toolkit, <span className="pink">live</span>.
      </SectionHeading>
      <p className="lede" data-reveal="up">
        The same maths the app runs, working right here on real photographs. Move a slider.</p>
      <div className={tk.grid}>
        <DofCalc />
        <GridLibrary />
        <GoldenClock />
        <More />
      </div>
    </section>
  )
}
