import { useEffect, useRef } from 'react'
import Photo from '../../components/Photo'
import { useReducedMotion } from '../../lib/motion'
import { creditLine, exifLine, photo } from '../../lib/photos'
import css from './Parallax.module.css'

/** Photos at different depths: deeper layers drift further as the section scrolls past, like pages lifting apart. */
const LAYERS: { id: string; depth: number; cls: string }[] = [
  { id: 'portrait', depth: 0.35, cls: css.a },
  { id: 'street', depth: 0.6, cls: css.b },
  { id: 'astro', depth: 0.2, cls: css.c },
  { id: 'fox', depth: 0.5, cls: css.d },
]

export default function Parallax() {
  const reduced = useReducedMotion()
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (reduced || !el || typeof IntersectionObserver === 'undefined') return
    const layers = [...el.querySelectorAll<HTMLElement>('[data-depth]')]
    let frame = 0
    let visible = false
    const paint = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      // -1 as the section enters from below, +1 as it leaves at the top.
      const t = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (r.top + r.height / 2)) / (window.innerHeight / 2 + r.height / 2)))
      // Phones get a gentler drift, so the stacked prints never collide.
      const reach = window.innerWidth < 760 ? 70 : 320
      for (const l of layers) l.style.transform = `translate3d(0, ${(-t * Number(l.dataset.depth) * reach).toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(paint)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) onScroll()
    })
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
      for (const l of layers) l.style.transform = ''
    }
  }, [reduced])

  return (
    <section ref={root} className={css.parallax} aria-labelledby="parallax-title">
      <div className={css.text}>
        <h2 id="parallax-title" className={css.title}>
          Every frame starts <span className="pink">before</span> the shutter.
        </h2>
        <p className="lede">
          Where you stand, how you hold the phone, what the light is doing. Prolens puts that thinking on the screen,
          so the decisions a photographer makes are there while you shoot.
        </p>
      </div>
      {LAYERS.map((l) => {
        const p = photo(l.id)
        return (
          <figure key={l.id} className={`${css.layer} ${l.cls}`} data-depth={l.depth}>
            <div className={css.frame}>
              <Photo id={l.id} sizes="(min-width: 900px) 30vw, 60vw" />
            </div>
            <figcaption className="mono">
              <span>{exifLine(p) || p.place}</span>
              <a href={p.page} target="_blank" rel="noopener">
                Photo: {creditLine(p)}
              </a>
            </figcaption>
          </figure>
        )
      })}
    </section>
  )
}
