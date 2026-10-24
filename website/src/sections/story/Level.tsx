import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import Photo from '../../components/Photo'
import type { Chapter } from './chapter'
import vf from './Viewfinder.module.css'
import lv from './Level.module.css'

const MAX = 15
const round = (v: number) => Math.round(Math.max(-MAX, Math.min(MAX, v)) * 10) / 10
/** The app's threshold: under half a degree counts as level. */
const isLevel = (roll: number) => Math.abs(roll) < 0.5

export function useLevel(): Chapter {
  const [roll, setRoll] = useState(4.5)
  const drag = useRef<{ x: number; roll: number } | null>(null)
  const level = isLevel(roll)
  const readout = `Roll ${roll.toFixed(1)}°`

  const down = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, roll }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setRoll(round(drag.current.roll + (e.clientX - drag.current.x) * 0.1))
  }
  const up = () => {
    drag.current = null
  }
  const key = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -0.5, ArrowDown: -0.5, ArrowRight: 0.5, ArrowUp: 0.5 }[e.key]
    if (step !== undefined) {
      e.preventDefault()
      setRoll((r) => round(r + step))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setRoll(0)
    }
  }

  return {
    id: 'level',
    photoId: 'level',
    hud: `PHOTO · LEVEL ${roll > 0 ? '+' : ''}${roll.toFixed(1)}° · 82 mm · f/8 · 1/1298 · ISO 200`,
    title: (
      <>
        Get the horizon <span className="pink">dead level</span>.
      </>
    ),
    body: 'The level reads the phone’s sensors and turns green inside half a degree. Drag the bar to tilt the camera until the fog line settles.',
    screen: () => (
      <>
        <div className={lv.tilted} style={{ transform: `rotate(${roll}deg) scale(1.38)` }}>
          <Photo id="level" sizes="(min-width: 980px) 56vw, 100vw" />
        </div>
        {/* The line follows the real horizon, as in the app's level overlay. */}
        <div data-horizon className={[lv.horizon, level ? lv.ok : ''].join(' ')} style={{ transform: `translateY(-50%) rotate(${roll}deg)` }} aria-hidden="true">
          <span />
        </div>
        <div className={lv.reference} aria-hidden="true" />
        <span className={[vf.tag, lv.rollTag, 'mono', level ? 'level' : ''].join(' ')}>{readout}</span>
      </>
    ),
    controls: (
      <div className={lv.controls}>
        <div
          role="slider"
          tabIndex={0}
          aria-label="Tilt"
          aria-valuemin={-MAX}
          aria-valuemax={MAX}
          aria-valuenow={roll}
          aria-valuetext={`${roll.toFixed(1)} degrees${level ? ', level' : ''}`}
          className={`${lv.surface} focusable`}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        >
          <div className={lv.ticks} aria-hidden="true" />
          <span className={lv.marker} style={{ left: `calc(24px + (100% - 48px) * ${(roll + MAX) / (2 * MAX)})` }} aria-hidden="true" />
        </div>
        <p className={[lv.readout, 'mono', level ? 'level' : ''].join(' ')} aria-hidden="true">
          {readout}
        </p>
      </div>
    ),
  }
}
