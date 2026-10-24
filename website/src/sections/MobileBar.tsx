import { useEffect, useState } from 'react'
import { useMedia } from '../lib/motion'
import { formatSize, useRelease } from '../lib/release'
import css from './MobileBar.module.css'

/**
 * On phones, a slim download bar rides the bottom of the screen once the hero has scrolled away,
 * and steps aside when the download section or the footer is on screen.
 */
export default function MobileBar() {
  const phone = useMedia('(max-width: 760px)')
  const info = useRelease()
  const [show, setShow] = useState(true)

  useEffect(() => {
    if (!phone || typeof IntersectionObserver === 'undefined') return
    const watched = [document.querySelector('header'), document.getElementById('download'), document.querySelector('footer')].filter(Boolean) as Element[]
    const visible = new Set<Element>()
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target)
        else visible.delete(e.target)
      }
      setShow(visible.size === 0)
    })
    watched.forEach((el) => io.observe(el))
    setShow(false)
    return () => io.disconnect()
  }, [phone])

  if (!phone) return null
  return (
    <div className={[css.bar, show ? css.on : ''].join(' ')} aria-hidden={!show}>
      <span className={css.name}>
        Prolens
        <span className="mono">
          {info.version} · {formatSize(info.sizeBytes)}
        </span>
      </span>
      <a className={`${css.cta} focusable`} href="#download" tabIndex={show ? undefined : -1}>
        Download
      </a>
    </div>
  )
}
