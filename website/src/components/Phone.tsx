import type { CSSProperties, ReactNode } from 'react'
import css from './Phone.module.css'

interface Props {
  tilt?: { x: number; y: number }
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const clamp = (v: number) => Math.max(-8, Math.min(8, v))

/** A phone drawn in CSS with a 9:19.5 screen. tilt is in degrees, clamped to ±8. */
export default function Phone({ tilt, className, style, children }: Props) {
  const transform = tilt ? `perspective(1400px) rotateX(${clamp(tilt.x)}deg) rotateY(${clamp(tilt.y)}deg)` : undefined
  return (
    <div className={[css.phone, className ?? ''].join(' ')} style={{ ...style, transform }}>
      <div className={css.screen}>
        {children}
        <span className={css.island} aria-hidden="true" />
      </div>
    </div>
  )
}
