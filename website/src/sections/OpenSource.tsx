import SectionHeading from '../components/SectionHeading'
import ShutterButton from '../components/ShutterButton'
import { issueUrl, releasesUrl, repoUrl } from '../lib/issues'
import css from './OpenSource.module.css'

export default function OpenSource() {
  return (
    <section className={`section ${css.open}`} aria-labelledby="open-title">
      <SectionHeading id="open-title" className="display">
        Built in the open. <span className="pink">Shaped by you.</span>
      </SectionHeading>
      <div className={css.body}>
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
      <div className={css.actions}>
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
