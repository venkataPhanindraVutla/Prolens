import { useEffect, useMemo, useRef, useState } from 'react'
import { falseColor, histogram, luma, peaking, zebra } from '../../lib/analysis'
import { photo, src } from '../../lib/photos'
import type { Chapter, Frame } from './chapter'
import css from './story.module.css'
import ex from './Expose.module.css'

type Tool = 'histogram' | 'zebras' | 'falseColour' | 'peaking'
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'histogram', label: 'Histogram' },
  { id: 'zebras', label: 'Zebras' },
  { id: 'falseColour', label: 'False colour' },
  { id: 'peaking', label: 'Peaking' },
]
const PHOTO = photo('expose')
/** Analysis runs at a fraction of the frame, like the app's downsampled preview. */
const SCALE = 2.5

/** Draws img into a w × h canvas the way object-fit: cover would, keeping the photo's focus point. */
function drawCover(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  const [fx, fy] = PHOTO.focus.split(' ').map((v) => parseFloat(v) / 100)
  g.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh)
}

function Screen({ tools, frame }: { tools: Set<Tool>; frame: Frame }) {
  const w = Math.round(frame.w / SCALE)
  const h = Math.round(frame.h / SCALE)
  const base = useRef<HTMLCanvasElement>(null)
  const over = useRef<HTMLCanvasElement>(null)
  const [l, setL] = useState<Uint8Array | null>(null)

  // Load the photo once, draw it, and keep its luma for the tools, when the browser is idle.
  useEffect(() => {
    const g = base.current?.getContext('2d', { willReadFrequently: true })
    if (!g) return
    let cancelled = false
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const run = () => {
        if (cancelled) return
        drawCover(g, img, w, h)
        setL(luma(g.getImageData(0, 0, w, h).data))
      }
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1500 })
      else setTimeout(run, 100)
    }
    img.src = src(PHOTO, 1280)
    return () => {
      cancelled = true
    }
  }, [w, h])

  useEffect(() => {
    const o = over.current?.getContext('2d')
    if (!o || !l) return
    const img = o.createImageData(w, h)
    if (tools.has('falseColour'))
      for (let i = 0; i < l.length; i++) {
        const [r, g, b] = falseColor(l[i])
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
    if (tools.has('zebras')) layer(zebra(l, w, h))
    if (tools.has('peaking')) layer(peaking(l, w, h))
    o.putImageData(img, 0, 0)
  }, [tools, l, w, h])

  const hist = useMemo(() => (l ? histogram(l) : null), [l])
  const max = hist ? Math.max(...hist) : 1
  return (
    <>
      <canvas ref={base} width={w} height={h} className={ex.canvas} role="img" aria-label={PHOTO.alt} />
      <canvas ref={over} width={w} height={h} className={ex.canvas} />
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
  const [tools, setTools] = useState<Set<Tool>>(() => new Set<Tool>(['zebras', 'histogram']))
  const toggle = (t: Tool) =>
    setTools((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  const on = TOOLS.filter((t) => tools.has(t.id)).map((t) => t.label.toUpperCase())
  return {
    id: 'expose',
    photoId: 'expose',
    hud: `PHOTO · ${on.length ? on.join(' + ') : 'NO OVERLAYS'} · 50 mm · f/6.3 · 1/400 · ISO 100`,
    title: (
      <>
        See exposure. <span className="pink">Don’t guess it.</span>
      </>
    ),
    body: 'This is the real photo, measured pixel by pixel. Zebras stripe what’s about to clip, false colour maps brightness like a cinema monitor, peaking outlines what’s sharp, and the histogram shows the whole frame at once.',
    screen: (f) => <Screen tools={tools} frame={f} />,
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
