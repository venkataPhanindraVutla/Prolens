import { repoUrl } from '../lib/issues'
import css from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={css.footer}>
      <p className={css.signoff}>Shoot like you mean it.</p>
      <div className={css.meta}>
        <p>
          Prolens is free and open source under Apache-2.0.{' '}
          <a className="focusable" href={repoUrl} target="_blank" rel="noopener">
            Source on GitHub
          </a>
        </p>
        <ul className={css.credits}>
          <li>Sun times: SunCalc by Vladimir Agafonkin (BSD-2)</li>
          <li>App type: Geist</li>
          <li>Site type: Space Grotesk, JetBrains Mono</li>
        </ul>
      </div>
    </footer>
  )
}
