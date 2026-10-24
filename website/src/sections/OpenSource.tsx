import SectionHeading from '../components/SectionHeading'
import ShutterButton from '../components/ShutterButton'
import { issueUrl, releasesUrl, repoUrl } from '../lib/issues'
import css from './OpenSource.module.css'

/** Counted from the app's source: core/grids, core/model/Modes.kt, features/viewfinder/Analysis.kt, core/model/Recipes.kt. */
const STATS: [string, string][] = [
  ['23', 'composition grids'],
  ['7', 'capture modes'],
  ['6', 'exposure tools'],
  ['15', 'shot recipes'],
]

export default function OpenSource() {
  return (
    <section className={`section ${css.open}`} aria-labelledby="open-title" data-stage>
      <SectionHeading id="open-title" className="display">
        Built in the open. <span className="pink">Shaped by you.</span>
      </SectionHeading>
      <div className={css.body} data-reveal="up">
        <p className="lede">
          Every line of Prolens is on GitHub under the Apache-2.0 licence: the Kotlin Multiplatform app, the exposure and
          depth-of-field maths, the sun tracker and all 23 grids.
        </p>
        <p className="lede">
          Shoot with it, then tell us what a real day out needed. The next build is made from those requests.
        </p>
        <a className={`${css.repo} mono focusable`} href={repoUrl} target="_blank" rel="noopener">
          github.com/venkataPhanindraVutla/Prolens
        </a>
      </div>
      <dl className={css.stats}>
        {STATS.map(([n, label], i) => (
          <div key={label} data-reveal="up" data-reveal-delay={i * 0.08}>
            <dt className="mono">{n}</dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      <div className={css.actions} data-reveal="up" data-reveal-delay={0.2}>
        <ShutterButton variant="primary" href={issueUrl('feature')} external>
          Request a feature
        </ShutterButton>
        <ShutterButton variant="ghost" href={issueUrl('bug')} external>
          Report a bug
        </ShutterButton>
        <ShutterButton variant="ghost" href={releasesUrl} external>
          Test builds
        </ShutterButton>
      </div>
    </section>
  )
}
