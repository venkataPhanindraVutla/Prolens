import { useId } from 'react'

export type SceneKind = 'golden-coast' | 'city-night' | 'flower-macro' | 'texture-micro' | 'runner' | 'panorama' | 'portrait'

/** Scenes are drawn on a 270 × 585 canvas, the phone screen's 9:19.5. */
export const SCENE_W = 270
export const SCENE_H = 585

/** A small seeded random generator, so drawn scenes look the same on every load. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

interface Props {
  kind: SceneKind
  className?: string
}

/** A viewfinder scene drawn in SVG: no photographs, just light and shape. */
export default function Scene({ kind, className }: Props) {
  const uid = useId().replace(/:/g, '')
  const id = (n: string) => `${uid}-${n}`
  const url = (n: string) => `url(#${id(n)})`
  return (
    <svg
      className={className}
      viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {kind === 'golden-coast' && <GoldenCoast id={id} url={url} />}
      {kind === 'city-night' && <CityNight id={id} url={url} />}
      {kind === 'flower-macro' && <FlowerMacro id={id} url={url} />}
      {kind === 'texture-micro' && <TextureMicro id={id} url={url} />}
      {kind === 'runner' && <Runner id={id} url={url} />}
      {kind === 'panorama' && <Panorama id={id} url={url} />}
      {kind === 'portrait' && <Portrait id={id} url={url} />}
    </svg>
  )
}

type Ids = { id: (n: string) => string; url: (n: string) => string }

function GoldenCoast({ id, url }: Ids) {
  const r = rng(7)
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1030" />
          <stop offset="0.38" stopColor="#6b2a4a" />
          <stop offset="0.52" stopColor="#d9623f" />
          <stop offset="0.6" stopColor="#f6b25e" />
        </linearGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b2c3a" />
          <stop offset="0.4" stopColor="#1f1622" />
          <stop offset="1" stopColor="#0b0a0d" />
        </linearGradient>
        <radialGradient id={id('sun')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff4d6" />
          <stop offset="0.25" stopColor="#ffd27a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ff7a3d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="270" height="352" fill={url('sky')} />
      <circle cx="182" cy="340" r="120" fill={url('sun')} opacity="0.7" />
      <circle cx="182" cy="342" r="17" fill="#fff1cf" />
      <rect y="350" width="270" height="235" fill={url('sea')} />
      {Array.from({ length: 16 }, (_, i) => {
        const y = 358 + i * 9 + r() * 4
        const w = 40 - i * 1.6 + r() * 14
        return <rect key={i} x={182 - w / 2 + (r() - 0.5) * 10} y={y} width={w} height={1.6} fill="#ffcf86" opacity={0.75 - i * 0.04} />
      })}
      <path d="M0 470 C 60 455 120 462 170 476 S 250 492 270 488 V585 H0Z" fill="#0d0b0e" />
      {/* A figure standing on the lower-left thirds point. */}
      <g fill="#060507" transform="translate(90 470)">
        <ellipse cx="0" cy="-74" rx="6.5" ry="7.5" />
        <path d="M-7 -65 Q0 -68 7 -65 L9 -32 L5 -32 L4 0 L1 0 L0 -30 L-1 0 L-4 0 L-5 -32 L-9 -32 Z" />
      </g>
      <g fill="#120d14" opacity="0.9">
        <path d="M-10 352 L30 330 L58 344 L84 336 L120 352 Z" />
      </g>
    </>
  )
}

function CityNight({ id, url }: Ids) {
  const r = rng(11)
  const towers = Array.from({ length: 11 }, (_, i) => {
    const w = 22 + r() * 22
    const h = 120 + r() * 230
    return { x: i * 26 - 10 + r() * 8, w, h }
  })
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05060f" />
          <stop offset="0.6" stopColor="#141a3a" />
          <stop offset="1" stopColor="#3a1f45" />
        </linearGradient>
        <linearGradient id={id('trail')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff2dab" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ff2dab" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
      </defs>
      <rect width="270" height="585" fill={url('sky')} />
      <circle cx="206" cy="96" r="12" fill="#f4f1e0" opacity="0.85" />
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={r() * 270} cy={r() * 200} r={r() * 0.9 + 0.3} fill="#fff" opacity={0.3 + r() * 0.5} />
      ))}
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={470 - t.h} width={t.w} height={t.h + 10} fill={i % 2 ? '#0d0f1c' : '#111427'} />
          {Array.from({ length: Math.floor(t.h / 14) }, (_, row) =>
            Array.from({ length: Math.floor(t.w / 8) }, (_, col) =>
              r() > 0.62 ? (
                <rect key={`${row}-${col}`} x={t.x + 3 + col * 8} y={478 - t.h + row * 14} width={4} height={6} fill={r() > 0.5 ? '#ffd88a' : '#9fc6ff'} opacity={0.5 + r() * 0.5} />
              ) : null,
            ),
          )}
        </g>
      ))}
      <rect y="470" width="270" height="115" fill="#07070b" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M-20 ${560 - i * 9} C 80 ${520 - i * 8} 180 ${505 - i * 6} 300 ${492 - i * 5}`} stroke={url('trail')} strokeWidth={1.6 + (i % 2)} fill="none" opacity={0.85 - i * 0.1} />
      ))}
    </>
  )
}

function FlowerMacro({ id, url }: Ids) {
  const r = rng(23)
  return (
    <>
      <defs>
        <radialGradient id={id('bg')} cx="0.4" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#3f6b2a" />
          <stop offset="0.6" stopColor="#1c3318" />
          <stop offset="1" stopColor="#0a120a" />
        </radialGradient>
        <radialGradient id={id('petal')} cx="0.5" cy="0.9" r="1">
          <stop offset="0" stopColor="#ffe3f3" />
          <stop offset="0.45" stopColor="#ff7cc8" />
          <stop offset="1" stopColor="#b3126e" />
        </radialGradient>
        <filter id={id('soft')}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width="270" height="585" fill={url('bg')} />
      <g filter={url('soft')}>
        {Array.from({ length: 9 }, (_, i) => (
          <circle key={i} cx={r() * 270} cy={r() * 585} r={14 + r() * 26} fill={r() > 0.5 ? '#d4ff3f' : '#ffd1ec'} opacity={0.18 + r() * 0.2} />
        ))}
      </g>
      <path d="M140 585 C 138 500 150 420 136 330" stroke="#2f5a22" strokeWidth="7" fill="none" />
      <g transform="translate(136 300)">
        {Array.from({ length: 10 }, (_, i) => (
          <ellipse key={i} cx="0" cy="-62" rx="26" ry="64" fill={url('petal')} transform={`rotate(${i * 36})`} opacity="0.95" />
        ))}
        <circle r="26" fill="#ffcf3a" />
        {Array.from({ length: 22 }, (_, i) => {
          const a = i * 2.4
          const d = 4 + i * 0.95
          return <circle key={i} cx={Math.cos(a) * d} cy={Math.sin(a) * d} r="2.2" fill="#8a4a00" />
        })}
      </g>
    </>
  )
}

function TextureMicro({ id, url }: Ids) {
  const r = rng(5)
  return (
    <>
      <defs>
        <linearGradient id={id('leaf')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7ec23a" />
          <stop offset="1" stopColor="#1f4d12" />
        </linearGradient>
        <radialGradient id={id('drop')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#d7f5b0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#1f4d12" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <rect width="270" height="585" fill={url('leaf')} />
      <path d="M-20 620 L300 -40" stroke="#e8f7c8" strokeWidth="5" opacity="0.7" />
      {Array.from({ length: 14 }, (_, i) => {
        const t = i / 14
        const x = -20 + 320 * t
        const y = 620 - 660 * t
        return (
          <g key={i} stroke="#d8efb4" fill="none" opacity="0.5">
            <path d={`M${x} ${y} q ${-60} ${-30} ${-130} ${-20}`} strokeWidth="2" />
            <path d={`M${x} ${y} q ${40} ${50} ${120} ${60}`} strokeWidth="2" />
          </g>
        )
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const rr = 6 + r() * 22
        return (
          <g key={i}>
            <circle cx={r() * 270} cy={r() * 585} r={rr} fill={url('drop')} stroke="#f2ffe0" strokeOpacity="0.5" />
          </g>
        )
      })}
    </>
  )
}

function Runner({ id, url }: Ids) {
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a3d6b" />
          <stop offset="1" stopColor="#c2856b" />
        </linearGradient>
        <linearGradient id={id('streak')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f4f4ef" stopOpacity="0" />
          <stop offset="1" stopColor="#f4f4ef" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect width="270" height="300" fill={url('sky')} />
      <rect y="300" width="270" height="285" fill="#a2402d" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={135} y1={300} x2={-200 + i * 135} y2={585} stroke="#f4f4ef" strokeWidth="2" opacity="0.7" />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={10} y={360 + i * 18} width={110 - i * 12} height={3} fill={url('streak')} />
      ))}
      <g fill="#0e0b0b" transform="translate(150 470) scale(1.25)">
        <circle cx="4" cy="-118" r="10" />
        <path d="M-6 -106 L14 -104 L20 -64 L10 -62 Z" />
        <path d="M14 -100 L40 -86 L36 -80 L12 -90 Z" />
        <path d="M-2 -100 L-26 -78 L-20 -72 L2 -90 Z" />
        <path d="M10 -66 L36 -34 L28 0 L20 -2 L26 -32 L4 -56 Z" />
        <path d="M14 -64 L-6 -36 L-30 -40 L-28 -48 L-10 -46 L6 -66 Z" />
      </g>
    </>
  )
}

function Panorama({ id, url }: Ids) {
  return (
    <>
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141a33" />
          <stop offset="0.5" stopColor="#5a3d6e" />
          <stop offset="0.8" stopColor="#f08a6a" />
        </linearGradient>
      </defs>
      <rect width="270" height="585" fill={url('sky')} />
      <path d="M0 330 L40 270 L70 300 L110 220 L150 290 L190 250 L230 300 L270 260 V585 H0Z" fill="#3b2a4f" />
      <path d="M0 380 L50 320 L90 360 L140 300 L180 350 L220 320 L270 360 V585 H0Z" fill="#251b33" />
      <path d="M0 440 L60 390 L120 430 L170 395 L270 440 V585 H0Z" fill="#140f1c" />
      {/* Stitch seams, the way Prolens joins frames. */}
      {[90, 180].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="585" stroke="#f4f4ef" strokeOpacity="0.18" strokeDasharray="4 6" />
      ))}
    </>
  )
}

function Portrait({ id, url }: Ids) {
  const r = rng(31)
  return (
    <>
      <defs>
        <radialGradient id={id('bg')} cx="0.7" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#ffd9a0" />
          <stop offset="0.35" stopColor="#c86a4a" />
          <stop offset="1" stopColor="#1a0f14" />
        </radialGradient>
        <filter id={id('bokeh')}>
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect width="270" height="585" fill={url('bg')} />
      <g filter={url('bokeh')}>
        {Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={r() * 270} cy={r() * 300} r={10 + r() * 20} fill="#ffe7b8" opacity={0.25 + r() * 0.35} />
        ))}
      </g>
      <g transform="translate(135 360)">
        <path d="M-120 230 C -110 120 -60 90 0 88 C 60 90 110 120 120 230 Z" fill="#120a0e" />
        <rect x="-20" y="40" width="40" height="56" fill="#120a0e" />
        <ellipse cx="0" cy="-10" rx="52" ry="66" fill="#120a0e" />
        <path d="M-46 -60 C -30 -96 30 -100 50 -56" stroke="#ffd18a" strokeWidth="3" fill="none" opacity="0.9" />
        <path d="M50 -50 C 58 -20 56 20 40 46" stroke="#ffb46a" strokeWidth="2.4" fill="none" opacity="0.8" />
      </g>
    </>
  )
}
