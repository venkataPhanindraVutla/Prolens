import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/motion'
import css from './SectionHeading.module.css'

interface Props {
  level?: 2 | 3
  id?: string
  className?: string
  children: ReactNode
}

/**
 * A heading that pulls focus, blurred to sharp, the first time it scrolls into view.
 * It renders sharp first, so pre-rendered HTML and no-JS readers always see it, and only blurs once mounted below the fold.
 */
export default function SectionHeading({ level = 2, id, className, children }: Props) {
  const reduced = useReducedMotion()
  const [blurred, setBlurred] = useState(false)
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (reduced || typeof IntersectionObserver === 'undefined' || !el) {
      // Reduced motion can arrive after hydration; never leave a heading stuck blurred.
      setBlurred(false)
      return
    }
    if (el.getBoundingClientRect().top < window.innerHeight) return
    setBlurred(true)
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setBlurred(false)
          io.disconnect()
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag ref={ref} id={id} className={[css.heading, blurred ? 'blurred' : '', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  )
}
