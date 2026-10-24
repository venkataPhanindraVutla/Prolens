import { useEffect, useMemo, useRef, useState } from 'react'
import { falseColor, histogram, luma, peaking, zebra } from '../../lib/analysis'
import type { Chapter } from './chapter'
import css from './story.module.css'
import ex from './Expose.module.css'

const W = 270
const H = 480
type Tool = 'histogram' | 'zebras' | 'falseColour' | 'peaking'
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'histogram', label: 'Histogram' },
  { id: 'zebras', label: 'Zebras' },
  { id: 'falseColour', label: 'False colour' },
  { id: 'peaking', label: 'Peaking' },
]

/** A backlit portrait: blown sky, a hard rim and a dark foreground, so every tool has something to show. */
function drawPhoto(g: CanvasRenderingContext2D) {
  const sky = g.createLinearGradient(0, 0, 0, H * 0.62)
  sky.addColorStop(0, '#9fb6d6')
  sky.addColorStop(0.55, '#f6efe0')
  sky.addColorStop(1, '#fffaf0')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  const sun = g.createRadialGradient(196, 120, 4, 196, 120, 120)
  sun.addColorStop(0, '#ffffff')
  sun.addColorStop(0.3, '#fff8e6')
  sun.addColorStop(1, 'rgba(255,240,210,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#6d6a72'
  g.beginPath()
  g.moveTo(0, 300)
  g.lineTo(60, 268)
  g.lineTo(120, 290)
  g.lineTo(190, 262)
  g.lineTo(W, 296)
  g.lineTo(W, H)
  g.lineTo(0, H)
  g.fill()
  const ground = g.createLinearGradient(0, 300, 0, H)
  ground.addColorStop(0, '#3b3530')
  ground.addColorStop(1, '#070606')
  g.fillStyle = ground
  g.fillRect(0, 318, W, H)
  // Head and shoulders against the light.
  g.fillStyle = '#1a1414'
  g.beginPath()
  g.ellipse(118, 238, 42, 52, 0, 0, Math.PI * 2)
  g.fill()
  g.beginPath()
  g.moveTo(20, H)
  g.bezierCurveTo(30, 360, 70, 318, 118, 316)
  g.bezierCurveTo(166, 318, 206, 360, 216, H)
  g.fill()
  g.fillRect(100, 280, 36, 44)
  g.strokeStyle = '#fffaf0'
  g.lineWidth = 4
  g.beginPath()
  g.ellipse(118, 238, 43, 53, 0, -2.5, -0.2)
  g.stroke()
}

function Screen({ tools }: { tools: Set<Tool> }) {
  const base = useRef<HTMLCanvasElement>(null)
  const over = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState<Uint8Array | null>(null)

  // Draw the photo once and keep its luma for the tools, when the browser is idle so page load stays quick.
  useEffect(() => {
    const g = base.current?.getContext('2d', { willReadFrequently: true })
    if (!g) return
    const run = () => {
      drawPhoto(g)
      setFrame(luma(g.getImageData(0, 0, W, H).data))
    }
    // Safari has no requestIdleCallback.
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 2000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(run, 200)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    const o = over.current?.getContext('2d')
    if (!o || !frame) return
    const img = o.createImageData(W, H)
    if (tools.has('falseColour'))
      for (let i = 0; i < frame.length; i++) {
        const [r, g, b] = falseColor(frame[i])
        img.data.set([r, g, b, 255], i * 4)
      }
    const layer = (px: Uint8ClampedArray) => {
      for (let i = 0; i < px.length; i += 4)
        if (px[i + 3]) {
          const a = px[i + 3] / 255
          for (let k = 0; k < 3; k++) img.data[i + k] = img.data[i + k] * (1 - a) + px[i + k] * a
          img.data[i + 3] = Math.max(img.data[i + 3], px[i + 3])
        }
    }
    if (tools.has('zebras')) layer(zebra(frame, W, H))
    if (tools.has('peaking')) layer(peaking(frame, W, H))
    o.putImageData(img, 0, 0)
  }, [tools, frame])

  const hist = useMemo(() => (frame ? histogram(frame) : null), [frame])
  const max = hist ? Math.max(...hist) : 1
  return (
    <>
      <canvas ref={base} width={W} height={H} className={ex.canvas} />
      <canvas ref={over} width={W} height={H} className={ex.canvas} />
      {tools.has('histogram') && hist && (
        <svg className={ex.hist} viewBox="0 0 64 32" preserveAspectRatio="none" aria-hidden="true">
          {hist.map((v, i) => (
            <rect key={i} x={i} y={32 - (v / max) * 32} width={1} height={(v / max) * 32} />
          ))}
        </svg>
      )}
    </>
  )
}

export function useExpose(): Chapter {
  const [tools, setTools] = useState<Set<Tool>>(() => new Set<Tool>(['zebras']))
  const toggle = (t: Tool) =>
    setTools((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  return {
    id: 'expose',
    title: (
      <>
        See exposure. <span className="pink">Don’t guess it.</span>
      </>
    ),
    body: 'Zebras stripe what’s about to clip, false colour maps brightness like a cinema monitor, peaking outlines what’s in focus, and the histogram shows the whole frame at once.',
    screen: <Screen tools={tools} />,
    controls: (
      <div className={css.chips}>
        {TOOLS.map((t) => (
          <button key={t.id} type="button" aria-pressed={tools.has(t.id)} className={`${css.chip} focusable`} onClick={() => toggle(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
    ),
  }
}
