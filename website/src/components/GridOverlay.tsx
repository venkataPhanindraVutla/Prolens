import { useId } from 'react'
import { gridShapes } from '../lib/grids'

interface Props {
  id: string
  width: number
  height: number
  color?: string
  className?: string
}

/** A composition grid drawn over a frame, clipped to it. */
export default function GridOverlay({ id, width, height, color = 'var(--paper)', className }: Props) {
  const clip = useId()
  const shapes = gridShapes(id, width, height)
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <clipPath id={clip}>
        <rect width={width} height={height} />
      </clipPath>
      <g clipPath={`url(#${clip})`} stroke={color} strokeWidth={1.25} fill="none" vectorEffect="non-scaling-stroke">
        {shapes.map((s, i) => {
          const common = {
            strokeOpacity: s.alpha * 0.8,
            strokeDasharray: s.dashed ? '6 5' : undefined,
            vectorEffect: 'non-scaling-stroke' as const,
          }
          switch (s.kind) {
            case 'line':
              return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...common} />
            case 'poly': {
              const pts = s.points.map((p) => p.join(',')).join(' ')
              return s.closed ? <polygon key={i} points={pts} {...common} /> : <polyline key={i} points={pts} {...common} />
            }
            case 'rect':
              return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} {...common} />
            case 'circle':
              return s.r <= 4 ? (
                <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={color} fillOpacity={0.9} stroke="none" />
              ) : (
                <circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />
              )
          }
        })}
      </g>
    </svg>
  )
}
