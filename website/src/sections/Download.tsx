import { useState } from 'react'
import CropMarks from '../components/CropMarks'
import Photo from '../components/Photo'
import SectionHeading from '../components/SectionHeading'
import ShutterButton from '../components/ShutterButton'
import { creditLine, photo } from '../lib/photos'
import { formatSize, useRelease } from '../lib/release'
import css from './Download.module.css'
import Waitlist from './Waitlist'

const NIGHT = photo('night')

export default function Download() {
  const info = useRelease()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!info.sha256) return
    try {
      await navigator.clipboard.writeText(info.sha256)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="download" className={css.download} aria-labelledby="download-title">
      <div className={css.backdrop} aria-hidden="true">
        <Photo id="night" sizes="100vw" decorative />
      </div>
      <div className={css.inner}>
        <SectionHeading id="download-title" className="display">
          Take it out <span className="pink">tonight</span>.
        </SectionHeading>
        <p className="lede" data-reveal="up">
          Free, no account, no ads. Install the APK, point it at something, and tell us what's missing.</p>

        <div className={css.card} data-reveal="up" data-reveal-delay={0.1}>
          <CropMarks />
          <ShutterButton variant="primary" href={info.url} className={css.cta}>
            Download Prolens {info.version} for Android
          </ShutterButton>
          <p className={`mono ${css.meta}`}>
            <span>{formatSize(info.sizeBytes)}</span>
            <span>Android 7+</span>
            {info.sha256 && (
              <span className={css.hash}>
                SHA-256{' '}
                <span title={info.sha256}>
                  {info.sha256.slice(0, 8)}…{info.sha256.slice(-8)}
                </span>
                <button type="button" className={`${css.copy} focusable`} onClick={copy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </span>
            )}
          </p>
          <ol className={css.steps}>
            <li>Download the APK.</li>
            <li>Allow installs from your browser when Android asks.</li>
            <li>Open Prolens and grant camera access.</li>
          </ol>
          <Waitlist />
        </div>
        <p className={`${css.credit} mono`}>
          <a href={NIGHT.page} target="_blank" rel="noopener">
            {NIGHT.place} — {creditLine(NIGHT)}
          </a>
        </p>
      </div>
    </section>
  )
}
