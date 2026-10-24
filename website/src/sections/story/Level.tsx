import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import AppViewfinder from '../../app-ui/AppViewfinder'
import Photo from '../../components/Photo'
import type { Chapter } from './chapter'
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

  const chips = [{ text: `Roll ${roll.toFixed(1)}° · Pitch 0°`, tone: level ? ('success' as const) : undefined }, { text: 'Eye level' }]
  if (Math.abs(roll) > 8) chips.push({ text: 'Dutch tilt' })

  return {
    id: 'level',
    photoId: 'level',
    title: (
      <>
        Get the horizon <span className="pink">dead level</span>.
      </>
    ),
    body: 'It turns green inside half a degree. Drag the bar until the fog line settles.',
    phone: (
      <AppViewfinder
        preview={
          <div className={lv.tilted} style={{ transform: `rotate(${roll}deg) scale(1.3)` }}>
            <Photo id="level" sizes="360px" />
          </div>
        }
        overlay={
          <>
            <div data-horizon className={[lv.horizon, level ? lv.ok : ''].join(' ')} style={{ transform: `translateY(-50%) rotate(${roll}deg)` }} aria-hidden="true">
              <span />
            </div>
            <div className={lv.reference} aria-hidden="true" />
          </>
        }
        chips={chips}
        histogram={null}
        tools={{ histogram: false }}
      />
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
