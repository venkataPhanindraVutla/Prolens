import { useEffect, useRef, useState } from 'react'
import Phone from '../../components/Phone'
import SectionHeading from '../../components/SectionHeading'
import { useMedia } from '../../lib/motion'
import type { Chapter } from './chapter'
import { useCompose } from './Compose'
import { useExpose } from './Expose'
import { useLevel } from './Level'
import { useLight } from './Light'
import { useModes } from './Modes'
import css from './story.module.css'

/** The phone stays put on wide screens while the chapters scroll past and swap its screen. */
export default function Story() {
  const chapters: Chapter[] = [useCompose(), useLevel(), useExpose(), useModes(), useLight()]
  const wide = useMedia('(min-width: 900px)')
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (!wide || typeof IntersectionObserver === 'undefined') return
    // A chapter is active while it crosses the middle fifth of the window.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { rootMargin: '-40% 0px -40% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [wide])

  return (
    <section id="story" className={[css.story, wide ? css.wide : ''].join(' ')} aria-label="What Prolens does">
      {wide && (
        <div className={css.pin}>
          <Phone>
            {chapters.map((c, i) => (
              <div key={c.id} className={[css.layer, i === active ? css.on : ''].join(' ')} aria-hidden={i !== active}>
                {c.screen}
              </div>
            ))}
          </Phone>
        </div>
      )}
      <div>
        {chapters.map((c, i) => (
          <article
            key={c.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            data-index={i}
            className={[css.chapter, i === active ? css.active : ''].join(' ')}
            aria-labelledby={`chapter-${c.id}`}
          >
            {!wide && <Phone className={css.inlinePhone}>{c.screen}</Phone>}
            <SectionHeading id={`chapter-${c.id}`}>{c.title}</SectionHeading>
            <p className={css.body}>{c.body}</p>
            {c.controls}
          </article>
        ))}
      </div>
    </section>
  )
}
