import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from '../lib/motion'
import css from './SectionHeading.module.css'

interface Props {
  level?: 2 | 3
  id?: string
  className?: string
  children: ReactNode
}

/** A heading that pulls focus, blurred to sharp, the first time it scrolls into view. */
export default function SectionHeading({ level = 2, id, className, children }: Props) {
  const reduced = useReducedMotion()
  const canWatch = typeof IntersectionObserver !== 'undefined'
  const [seen, setSeen] = useState(false)
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (reduced || !canWatch || seen || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setSeen(true)
      },
      { threshold: 0.4 },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [reduced, canWatch, seen])

  const blurred = !reduced && canWatch && !seen
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <Tag ref={ref} id={id} className={[css.heading, blurred ? 'blurred' : '', className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </Tag>
  )
}
