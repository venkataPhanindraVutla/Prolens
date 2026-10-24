import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { useMedia } from '../../lib/motion'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import SectionHeading from '../../components/SectionHeading'
import { luma, zebra } from '../../lib/analysis'
import { creditLine, photo, src } from '../../lib/photos'
import css from './BeforeAfter.module.css'

const W = 400
const H = 500
/** Horizontal crop that puts the arctic fox in the middle of a 4:5 frame. */
const ARCTIC_X = 0.17

/** The arctic fox pushed 1.3 stops too bright, with the app's zebras over what clips. Painted on a canvas from the real photo. */
function BlownWithZebras() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const g = ref.current?.getContext('2d', { willReadFrequently: true })
    if (!g) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight)
      g.filter = 'brightness(1.4) contrast(0.95)'
      g.drawImage(img, (W - img.naturalWidth * s) * ARCTIC_X, (H - img.naturalHeight * s) * 0.5, img.naturalWidth * s, img.naturalHeight * s)
      g.filter = 'none'
      const z = zebra(luma(g.getImageData(0, 0, W, H).data), W, H, 95)
      const over = g.createImageData(W, H)
      over.data.set(z)
      const tmp = document.createElement('canvas')
      tmp.width = W
      tmp.height = H
      tmp.getContext('2d')?.putImageData(over, 0, 0)
      g.drawImage(tmp, 0, 0)
    }
    img.src = src(photo('arctic'), 960)
    return () => {
      cancelled = true
    }
  }, [])
  return <canvas ref={ref} width={W} height={H} className={css.canvas} aria-hidden="true" />
}

interface Pair {
  id: string
  title: string
  photoId: string
  before: ReactNode
  after: ReactNode
  beforeLabel: string
  afterLabel: string
  note: string
}

const PAIRS: Pair[] = [
  {
    id: 'level',
    title: 'Level',
    photoId: 'level',
    before: (
      <div className={css.fill} style={{ transform: 'rotate(-5.5deg) scale(1.2)' }}>
        <Photo id="level" sizes="(min-width: 900px) 30vw, 85vw" decorative />
      </div>
    ),
    after: (
      <>
        <Photo id="level" sizes="(min-width: 900px) 30vw, 85vw" decorative />
        <div className={css.levelLine} />
      </>
    ),
    beforeLabel: 'Roll −5.5°',
    afterLabel: 'Roll 0.0° · level',
    note: 'A horizon five degrees off reads as a mistake. The level turns green the moment it isn’t.',
  },
  {
    id: 'exposure',
    title: 'Exposure',
    photoId: 'arctic',
    before: <BlownWithZebras />,
    after: <Photo id="arctic" sizes="(min-width: 900px) 30vw, 85vw" decorative style={{ objectPosition: `${ARCTIC_X * 100}% 50%` }} />,
    beforeLabel: '+1.3 EV · zebras',
    afterLabel: '0.0 EV · fur holds detail',
    note: 'White fur on snow clips without warning. Zebras stripe it first, so you pull exposure down before the shot.',
  },
  {
    id: 'compose',
    title: 'Composition',
    photoId: 'fox',
    before: <Photo id="fox" sizes="(min-width: 900px) 30vw, 85vw" decorative style={{ objectPosition: '8% 50%' }} />,
    after: (
      <>
        {/* Zoomed so the fox's head lands in the spiral's eye. */}
        <div className={css.fill} style={{ transform: 'scale(1.45)', transformOrigin: '65.7% 17.2%' }}>
          <Photo id="fox" sizes="(min-width: 900px) 40vw, 100vw" decorative style={{ objectPosition: '66% 50%' }} />
        </div>
        <GridOverlay id="spiralTrue" width={W} height={H} variant="app" />
      </>
    ),
    beforeLabel: 'Off balance',
    afterLabel: 'Golden spiral',
    note: 'Same fox, reframed so its head sits in the spiral’s eye and the reflection leads you in.',
  },
]

function Compare({ pair, delay }: { pair: Pair; delay: number }) {
  const [at, setAt] = useState(50)
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const p = photo(pair.photoId)

  const setFrom = (clientX: number) => {
    const r = box.current?.getBoundingClientRect()
    if (r) setAt(Math.round(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100))))
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setFrom(e.clientX)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) setFrom(e.clientX)
  }
  const up = () => {
    dragging.current = false
  }
  const key = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 }[e.key]
    if (step !== undefined) {
      e.preventDefault()
      setAt((v) => Math.max(0, Math.min(100, v + step)))
    }
  }

  return (
    <article className={css.pair} aria-labelledby={`ba-${pair.id}`} data-reveal="up" data-reveal-delay={delay}>
      <div
        ref={box}
        className={`${css.frame} focusable`}
        role="slider"
        tabIndex={0}
        aria-label={`Compare ${pair.title.toLowerCase()}: before and after`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={at}
        aria-valuetext={`${at}% before`}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <div className={css.layer}>{pair.after}</div>
        <div className={css.layer} style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }}>
          {pair.before}
        </div>
        <span className={`${css.tag} ${css.left} mono`}>{pair.beforeLabel}</span>
        <span className={`${css.tag} ${css.right} mono`}>{pair.afterLabel}</span>
        <span className={css.handle} style={{ left: `${at}%` }} aria-hidden="true">
          <b />
        </span>
      </div>
      <h3 id={`ba-${pair.id}`} className={css.title}>
        {pair.title}
      </h3>
      <p className={css.note}>{pair.note}</p>
      <a className={`${css.credit} mono`} href={p.page} target="_blank" rel="noopener">
        Photo: {creditLine(p)}
      </a>
    </article>
  )
}

export default function BeforeAfter() {
  const phone = useMedia('(max-width: 900px)')
  const [pick, setPick] = useState(0)
  if (phone)
    return (
      <section className={`section ${css.section}`} aria-labelledby="ba-title">
        <SectionHeading id="ba-title" className="display">
          One tool. <span className="pink">One better frame.</span>
        </SectionHeading>
        <p className="lede">Pick a tool, then drag across the photo.</p>
        <div className={css.tabs} role="tablist" aria-label="Comparisons">
          {PAIRS.map((p, i) => (
            <button key={p.id} type="button" role="tab" aria-selected={i === pick} className="focusable" onClick={() => setPick(i)}>
              {p.title}
            </button>
          ))}
        </div>
        <Compare key={PAIRS[pick].id} pair={PAIRS[pick]} delay={0} />
      </section>
    )
  return (
    <section className={`section ${css.section}`} aria-labelledby="ba-title" data-stage>
      <SectionHeading id="ba-title" className="display">
        One tool. <span className="pink">One better frame.</span>
      </SectionHeading>
      <p className="lede" data-reveal="up">
        Drag across each photo to see what the tool caught.
      </p>
      <div className={css.track}>
        {PAIRS.map((p, i) => (
          <Compare key={p.id} pair={p} delay={i * 0.12} />
        ))}
      </div>
    </section>
  )
}
