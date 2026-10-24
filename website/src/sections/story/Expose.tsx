import { useEffect, useRef, useState } from 'react'
import AppViewfinder from '../../app-ui/AppViewfinder'
import { falseColor, histogram, luma, peaking, zebra } from '../../lib/analysis'
import { photo, src } from '../../lib/photos'
import { PREVIEW, type Chapter } from './chapter'
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

/** Draws img into a w × h canvas the way object-fit: cover would, keeping the photo's focus point. */
function drawCover(g: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * s
  const dh = img.naturalHeight * s
  const [fx, fy] = PHOTO.focus.split(' ').map((v) => parseFloat(v) / 100)
  g.drawImage(img, (w - dw) * fx, (h - dh) * fy, dw, dh)
}

/** The photo, measured and painted at the viewfinder preview's size; reports its histogram up to the HUD. */
function Screen({ tools, onHistogram }: { tools: Set<Tool>; onHistogram: (h: number[]) => void }) {
  const w = PREVIEW.w
  const h = PREVIEW.h
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
        const lum = luma(g.getImageData(0, 0, w, h).data)
        setL(lum)
        onHistogram(histogram(lum))
      }
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 1500 })
      else setTimeout(run, 100)
    }
    img.src = src(PHOTO, 1280)
    return () => {
      cancelled = true
    }
  }, [w, h, onHistogram])

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

  return (
    <>
      <canvas ref={base} width={w} height={h} className={ex.canvas} role="img" aria-label={PHOTO.alt} />
      <canvas ref={over} width={w} height={h} className={ex.canvas} />
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
  const [hist, setHist] = useState<number[] | null>(null)
  return {
    id: 'expose',
    photoId: 'expose',
    title: (
      <>
        See exposure. <span className="pink">Don’t guess it.</span>
      </>
    ),
    body: 'The real photo, measured pixel by pixel. Zebras stripe what’s about to clip; peaking outlines what’s sharp.',
    phone: (
      <AppViewfinder
        preview={<Screen tools={tools} onHistogram={setHist} />}
        histogram={hist}
        tools={{ histogram: tools.has('histogram'), zebra: tools.has('zebras'), focus: tools.has('peaking') }}
        chips={tools.has('falseColour') ? [{ text: 'False colour' }] : []}
      />
    ),
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
