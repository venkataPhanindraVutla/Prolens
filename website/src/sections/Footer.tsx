import { repoUrl } from '../lib/issues'
import { PHOTOS } from '../lib/photos'
import css from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={css.footer}>
      <p className={css.signoff} data-reveal="up">
        Shoot like you mean it.
      </p>
      <div className={css.meta}>
        <div>
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
        <div className={css.photos}>
          <h2 className={css.photosTitle}>Photographs</h2>
          <p className={css.photosNote}>Every photograph is by the named photographer, from Wikimedia Commons, used under its licence and resized for the web. None was taken with Prolens.</p>
          <ul>
            {PHOTOS.map((p) => (
              <li key={p.id}>
                <a href={p.page} target="_blank" rel="noopener">
                  {p.place}
                </a>{' '}
                · {p.artist} ·{' '}
                <a href={p.licenseUrl} target="_blank" rel="noopener license">
                  {p.license}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
