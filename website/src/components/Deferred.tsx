import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Props {
  /** Reserved space until the content mounts, so the page doesn't jump. */
  minHeight: number | string
  children: ReactNode
}

/**
 * Mounts heavy, below-the-fold content only when it comes within reach of the screen.
 * The pre-rendered page ships just the placeholder, which keeps the first paint fast on slow phones.
 */
export default function Deferred({ minHeight, children }: Props) {
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
    <div ref={ref} style={shown ? undefined : { minHeight }}>
      {shown && children}
    </div>
  )
}
