import { useId, type ReactNode } from 'react'
import { gridShapes, type GridShape } from '../lib/grids'

interface Props {
  id: string
  width: number
  height: number
  color?: string
  className?: string
  /** 'app' draws like the Prolens viewfinder: white at 70% over a soft black shadow line (GridRenderer.kt). */
  variant?: 'site' | 'app'
}

function draw(shapes: GridShape[], dots: string, lineOpacity: (a: number) => number): ReactNode[] {
  return shapes.map((s, i) => {
    const common = {
      strokeOpacity: lineOpacity(s.alpha),
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
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={dots} fillOpacity={0.9} stroke="none" />
        ) : (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...common} />
        )
    }
  })
}

/** A composition grid drawn over a frame, clipped to it. */
export default function GridOverlay({ id, width, height, color = 'var(--paper)', className, variant = 'site' }: Props) {
  const clip = useId()
  const shapes = gridShapes(id, width, height)
  const lines = shapes.filter((s) => !(s.kind === 'circle' && s.r <= 4))
  return (
    <svg
      className={className}
      data-grid={id}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
    >
      <clipPath id={clip}>
        <rect width={width} height={height} />
      </clipPath>
      {variant === 'app' ? (
        <g clipPath={`url(#${clip})`} fill="none" strokeLinecap="round">
          <g stroke="#000" strokeWidth={3}>
            {draw(lines, 'none', (a) => 0.245 * a)}
          </g>
          <g stroke="#fff" strokeWidth={1.5} strokeOpacity={0.7}>
            {draw(shapes, '#fff', (a) => 0.7 * a)}
          </g>
        </g>
      ) : (
        <g clipPath={`url(#${clip})`} stroke={color} strokeWidth={1.25} fill="none">
          {draw(shapes, color, (a) => a * 0.8)}
        </g>
      )}
    </svg>
  )
}
