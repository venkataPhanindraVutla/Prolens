import SectionHeading from '../../components/SectionHeading'
import DofCalc from './DofCalc'
import GoldenClock from './GoldenClock'
import GridLibrary from './GridLibrary'
import tk from './Toolkit.module.css'

export default function Toolkit() {
  return (
    <section className={`section ${tk.toolkit}`} aria-labelledby="toolkit-title">
      <SectionHeading id="toolkit-title" className="display">
        The toolkit, <span className="pink">live</span>.
      </SectionHeading>
      <p className="lede">The same maths the app runs, working right here. Move a slider.</p>
      <div className={tk.grid}>
        <DofCalc />
        <GoldenClock />
        <GridLibrary />
      </div>
    </section>
  )
}
