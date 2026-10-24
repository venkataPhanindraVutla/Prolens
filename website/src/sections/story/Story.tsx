import { useEffect, useRef, useState } from 'react'
import AppPhone from '../../app-ui/AppPhone'
import SectionHeading from '../../components/SectionHeading'
import { useMedia } from '../../lib/motion'
import { creditLine, exifLine, photo } from '../../lib/photos'
import type { Chapter } from './chapter'
import { useCompose } from './Compose'
import { useExpose } from './Expose'
import { useLevel } from './Level'
import { useLight } from './Light'
import { useModes } from './Modes'
import css from './story.module.css'

function Caption({ id }: { id: string }) {
  const p = photo(id)
  const exif = exifLine(p)
  return (
    <p className={`${css.caption} mono`}>
      <span>{p.place}</span>
      {exif && <span>{exif}</span>}
      <a href={p.page} target="_blank" rel="noopener">
        Photo: {creditLine(p)}
      </a>
    </p>
  )
}

/**
 * Wide screens: the phone stays pinned beside the text while the chapters scroll past and swap its screen.
 * Phones: nothing pins. Each chapter is its own card, with the app screen and its controls together.
 */
export default function Story() {
  const chapters: Chapter[] = [useCompose(), useLevel(), useExpose(), useModes(), useLight()]
  const wide = useMedia('(min-width: 980px)')
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    if (!wide) return
    // The chapter crossing the middle of the window is the one on the pinned phone.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index))
      },
      { rootMargin: '-40% 0px -40% 0px' },
    )
    refs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [wide])

  const current = chapters[active]
  return (
    <section id="story" className={[css.story, wide ? css.wide : css.narrow].join(' ')} aria-label="What Prolens does">
      {wide && (
        <div className={css.pin}>
          <AppPhone statusBar={current.statusBar} className={css.phone}>
            {chapters.map((c, i) => (
              <div key={c.id} className={[css.layer, i === active ? css.on : ''].join(' ')} aria-hidden={i !== active}>
                {c.phone}
              </div>
            ))}
          </AppPhone>
        </div>
      )}
      <div className={css.chapters}>
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
            <SectionHeading id={`chapter-${c.id}`}>{c.title}</SectionHeading>
            {wide ? (
              <>
                <p className={css.body} data-reveal="up">
                  {c.body}
                </p>
                {c.controls}
              </>
            ) : (
              <>
                <p className={css.body}>{c.body}</p>
                <div className={css.cardPhone}>
                  <AppPhone statusBar={c.statusBar} className={css.phone}>
                    {c.phone}
                  </AppPhone>
                </div>
                <div className={css.cardControls}>{c.controls}</div>
              </>
            )}
            {c.photoId && <Caption id={c.photoId} />}
          </article>
        ))}
      </div>
    </section>
  )
}
