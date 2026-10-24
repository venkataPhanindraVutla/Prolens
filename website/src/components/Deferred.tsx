import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import css from './Deferred.module.css'

interface Props {
  /** Reserved space until the content mounts, so the page doesn't jump. */
  minHeight: number | string
  /** The same on phones, where most sections are far shorter than on wide screens. */
  phoneMinHeight?: number | string
  children: ReactNode
}

/**
 * Mounts heavy, below-the-fold content only when it comes within reach of the screen.
 * The pre-rendered page ships just the placeholder, which keeps the first paint fast on slow phones.
 */
const len = (v: number | string) => (typeof v === 'number' ? `${v}px` : v)
const reserve = (minHeight: number | string, phoneMinHeight: number | string) =>
  ({ '--min': len(minHeight), '--min-phone': len(phoneMinHeight) }) as CSSProperties

/** Empty space of the section's height, for a Suspense fallback while its code loads. */
export function Placeholder({ minHeight, phoneMinHeight = minHeight }: Omit<Props, 'children'>) {
  return <div className={css.wait} style={reserve(minHeight, phoneMinHeight)} />
}

export default function Deferred({ minHeight, phoneMinHeight = minHeight, children }: Props) {
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '1200px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={shown ? undefined : css.wait}
      style={shown ? undefined : reserve(minHeight, phoneMinHeight)}
    >
      {shown && children}
    </div>
  )
}
