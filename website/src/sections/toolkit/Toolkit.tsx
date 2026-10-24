import SectionHeading from '../../components/SectionHeading'
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

export default function Toolkit() {
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
      </div>
    </section>
  )
}
