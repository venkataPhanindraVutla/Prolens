import { useEffect, useRef } from 'react'
import GridOverlay from '../components/GridOverlay'
import Hud from '../components/Hud'
import Phone from '../components/Phone'
import Scene, { SCENE_H, SCENE_W } from '../components/Scene'
import ShutterButton from '../components/ShutterButton'
import { repoUrl } from '../lib/issues'
import { useCanHover, useReducedMotion } from '../lib/motion'
import css from './Hero.module.css'

const RAIL = 'GRIDS · LEVEL · PEAKING · ZEBRAS · FALSE COLOUR · NIGHT · MACRO · MICRO · PANO · SLO-MO · TEMPLATES · GOLDEN HOUR · '

export default function Hero() {
  const reduced = useReducedMotion()
  const canHover = useCanHover()
  const follow = canHover && !reduced
  const root = useRef<HTMLElement>(null)
  const leak = useRef<HTMLDivElement>(null)
  const tilt = useRef<HTMLDivElement>(null)

  // The light leak eases 12% of the way to the pointer each frame; the phone leans toward it.
  useEffect(() => {
    const el = root.current
    if (!follow || !el) return
    const target = { x: 0.62, y: 0.4 }
    const pos = { ...target }
    let frame = 0
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      target.x = (e.clientX - r.left) / r.width
      target.y = (e.clientY - r.top) / r.height
    }
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.12
      pos.y += (target.y - pos.y) * 0.12
      leak.current?.style.setProperty('--x', `${pos.x * 100}%`)
      leak.current?.style.setProperty('--y', `${pos.y * 100}%`)
      if (tilt.current)
        tilt.current.style.transform = `perspective(1400px) rotateX(${(pos.y - 0.5) * -10}deg) rotateY(${(pos.x - 0.5) * 14}deg) rotateZ(5deg)`
      frame = requestAnimationFrame(tick)
    }
    el.addEventListener('pointermove', move)
    frame = requestAnimationFrame(tick)
    return () => {
      el.removeEventListener('pointermove', move)
      cancelAnimationFrame(frame)
      if (tilt.current) tilt.current.style.transform = ''
    }
  }, [follow])

  return (
    <header ref={root} className={css.hero}>
      <div ref={leak} className={[css.leak, follow ? css.following : reduced ? css.still : css.drifting].join(' ')} aria-hidden="true" />

      <h1 className={css.word}>
        <span className="visually-hidden">Prolens</span>
        <span aria-hidden="true">
          PRO
          <br />
          <span className={css.outline}>LENS</span>
        </span>
      </h1>

      <div ref={tilt} className={css.phoneWrap}>
        <Phone className={css.phone}>
          <Scene kind="golden-coast" />
          <GridOverlay id="thirds" width={SCENE_W} height={SCENE_H} />
          <span className={css.focus} aria-hidden="true" />
          <div className={css.screenHud}>
            <Hud
              items={[
                { label: 'ISO', value: '100' },
                { label: 'S', value: '1/250' },
                { label: 'ƒ', value: '1.9' },
                { label: '', value: '24 mm' },
                { label: 'EV', value: '+0.3' },
              ]}
            />
          </div>
        </Phone>
      </div>

      <div className={css.copy}>
        <p className={css.sub}>
          Composition, exposure and light in your pocket. Built in the open, shaped by the photographers who use it.
        </p>
        <div className={css.ctas}>
          <ShutterButton variant="primary" href="#download">
            Download for Android
          </ShutterButton>
          <ShutterButton variant="ghost" href={repoUrl} external>
            View on GitHub
          </ShutterButton>
        </div>
      </div>

      <div className={[css.rail, reduced ? css.railStill : ''].join(' ')} aria-hidden="true">
        <span className="mono">
          {RAIL}
          {RAIL}
        </span>
      </div>
    </header>
  )
}
