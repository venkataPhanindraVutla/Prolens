import { useEffect, useRef, useState } from 'react'
import GridOverlay from '../components/GridOverlay'
import Photo from '../components/Photo'
import ShutterButton from '../components/ShutterButton'
import { repoUrl } from '../lib/issues'
import { useCanHover, useReducedMotion } from '../lib/motion'
import { creditLine, exifLine, photo, src } from '../lib/photos'
import css from './Hero.module.css'

const RAIL = 'GRIDS · LEVEL · PEAKING · ZEBRAS · FALSE COLOUR · NIGHT · MACRO · MICRO · PANO · SLO-MO · TEMPLATES · GOLDEN HOUR · '
const HERO = photo('hero')
const MAX_FRAMES = 5

interface Frame {
  n: number
  x: number
  y: number
}

/** The whole first screen is a viewfinder: a real photograph, live focus, and a shutter that takes frames. */
export default function Hero() {
  const reduced = useReducedMotion()
  const canHover = useCanHover()
  const follow = canHover && !reduced
  const root = useRef<HTMLElement>(null)
  const leak = useRef<HTMLDivElement>(null)
  const focus = useRef({ x: 0.5, y: 0.58 })
  const [frames, setFrames] = useState<Frame[]>([])
  const [taken, setTaken] = useState(0)
  const [flash, setFlash] = useState(0)

  // The light leak and the focus square ease toward the pointer, then sleep until it moves again.
  useEffect(() => {
    const el = root.current
    if (!follow || !el) return
    const target = { x: 0.5, y: 0.58 }
    const pos = { x: 0.52, y: 0.56 }
    let frame = 0
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.12
      pos.y += (target.y - pos.y) * 0.12
      focus.current = { ...pos }
      el.style.setProperty('--fx', `${pos.x * 100}%`)
      el.style.setProperty('--fy', `${pos.y * 100}%`)
      leak.current?.style.setProperty('--x', `${pos.x * 100}%`)
      leak.current?.style.setProperty('--y', `${pos.y * 100}%`)
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.0005 ? requestAnimationFrame(tick) : 0
    }
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.x = (e.clientX - r.left) / r.width
      target.y = (e.clientY - r.top) / r.height
      if (!frame) frame = requestAnimationFrame(tick)
    }
    el.addEventListener('pointermove', move)
    frame = requestAnimationFrame(tick)
    return () => {
      el.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
    }
  }, [follow])

  const shoot = () => {
    const n = taken + 1
    setTaken(n)
    setFrames((f) => [...f, { n, ...focus.current }].slice(-MAX_FRAMES))
    if (!reduced) setFlash((k) => k + 1)
  }

  return (
    <header ref={root} className={css.hero}>
      <div className={css.photo}>
        <Photo id="hero" sizes="100vw" priority />
      </div>
      <div className={css.shade} aria-hidden="true" />
      <GridOverlay id="thirds" width={1600} height={900} className={css.grid} color="rgb(244 244 239 / 0.55)" />
      <div ref={leak} className={[css.leak, follow ? '' : reduced ? css.still : css.drifting].join(' ')} aria-hidden="true" />
      {flash > 0 && <div key={flash} className={css.flash} aria-hidden="true" />}

      <div className={css.frame} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className={`${css.hud} mono`} aria-hidden="true">
        <span>
          <i className={css.dot} /> PRO · RAW+JPEG · 3:2
        </span>
        <span className={css.exposure}>{exifLine(HERO).split(' · ').slice(1).join('   ')}</span>
      </div>

      <span className={css.focus} aria-hidden="true">
        <b className="mono">AF</b>
      </span>

      <h1 className={css.word}>
        <span className="visually-hidden">Prolens</span>
        <span aria-hidden="true">
          PRO
          <br />
          <span className={css.outline}>LENS</span>
        </span>
      </h1>

      <div className={css.copy}>
        <p className={css.sub}>
          Composition, exposure and light in your pocket. Built in the open, shaped by the photographers who use it.
        </p>
        <div className={css.ctas}>
          <ShutterButton variant="primary" href="#download">
            Download for Android
          </ShutterButton>
          <ShutterButton variant="ghost" href={repoUrl} external className={css.ghost}>
            View on GitHub
          </ShutterButton>
        </div>
      </div>

      <div className={css.camera}>
        <button type="button" className={`${css.shutter} focusable`} onClick={shoot} aria-label="Take a photo">
          <span />
        </button>
        <div className={css.roll} aria-live="polite">
          <ol>
            {frames.map((f) => (
              <li
                key={f.n}
                style={{
                  backgroundImage: `url(${src(HERO, 640)})`,
                  backgroundPosition: `${f.x * 100}% ${f.y * 100}%`,
                }}
              />
            ))}
          </ol>
          <span className="mono">{taken === 0 ? 'Tap to shoot' : `${taken} ${taken === 1 ? 'frame' : 'frames'}`}</span>
        </div>
      </div>

      <p className={`${css.credit} mono`}>
        <a href={HERO.page} target="_blank" rel="noopener">
          {HERO.place} — {creditLine(HERO)}
        </a>
      </p>

      <div className={[css.rail, reduced ? css.railStill : ''].join(' ')} aria-hidden="true">
        <span className="mono">
          {RAIL}
          {RAIL}
        </span>
      </div>
    </header>
  )
}
