import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import AppPhone from '../../app-ui/AppPhone'
import { LiveCalculators, LiveCoach, LiveGear, LiveLight, LiveToolkit, LiveViewfinder } from '../../app-ui/live/LiveScreens'
import SectionHeading from '../../components/SectionHeading'
import { useReducedMotion } from '../../lib/motion'
import css from './AppTour.module.css'
import ExplodedPhone, { LAYERS } from './ExplodedPhone'

const NAMES = ['Viewfinder', 'Toolkit', 'Calculators', 'Light', 'Coach', 'Gear']

/** Scroll progress: layers hold apart, then assemble upright into the first screen, then the tour runs. */
const HOLD = 0.12
const ASSEMBLED = 0.25
const HANDOFF = 0.28
const TOUR_FROM = 0.31
const TOUR_TO = 0.97

/** Each screen holds the centre for most of its stretch of scroll, then glides quickly to the next. */
export function dwell(v: number): number {
  const n = Math.floor(v)
  const t = v - n
  if (t < 0.35) return n
  if (t > 0.65) return n + 1
  const k = (t - 0.35) / 0.3
  return n + k * k * (3 - 2 * k)
}

function screenFor(name: string, open: (s: string) => void): { statusBar?: boolean; node: ReactNode } {
  switch (name) {
    case 'Viewfinder':
      return { node: <LiveViewfinder /> }
    case 'Toolkit':
      return { statusBar: true, node: <LiveToolkit onOpen={open} /> }
    case 'Calculators':
      return { statusBar: true, node: <LiveCalculators /> }
    case 'Light':
      return { statusBar: true, node: <LiveLight /> }
    case 'Coach':
      return { statusBar: true, node: <LiveCoach /> }
    default:
      return { statusBar: true, node: <LiveGear /> }
  }
}

/**
 * One phone in the cover-flow. Centred, it faces you and takes taps; the others shrink, turn away, darken and sit
 * behind it, further back the further they are.
 */
function Cover({ i, at, flat, children }: { i: number; at: MotionValue<number>; flat: boolean; children: ReactNode }) {
  const off = useTransform(at, (v) => i - v)
  const dist = useTransform(off, (o) => Math.min(Math.abs(o), 3))
  const x = useTransform(off, (o) => `${Math.sign(o) * Math.min(Math.abs(o), 3) * 64}%`)
  const rotateY = useTransform(off, (o) => Math.max(-50, Math.min(50, -o * 40)))
  const z = useTransform(dist, (d) => -d * 260)
  const scale = useTransform(dist, (d) => 1 - Math.min(d, 2) * 0.12)
  const opacity = useTransform(dist, (d) => Math.max(0, 1 - Math.max(0, d - 1) * 0.55))
  const shade = useTransform(dist, (d) => Math.min(d, 1.5) * 0.45)
  const zIndex = useTransform(dist, (d) => 20 - Math.round(d * 4))
  const pointerEvents = useTransform(dist, (d) => (d < 0.5 ? 'auto' : 'none'))
  return (
    <motion.div
      data-3d
      className={css.cover}
      style={flat ? undefined : { x, rotateY, z, scale, opacity, zIndex, pointerEvents, transformPerspective: 1400 }}
    >
      {children}
      {!flat && <motion.span className={css.shade} style={{ opacity: shade }} aria-hidden="true" />}
    </motion.div>
  )
}

/**
 * The whole app as one pinned scene. Scrolling in, the phone arrives pulled apart into the layers it draws and
 * assembles; touch a layer's name to lift it, drag to spin it. Scrolling on, the assembled phone becomes the first
 * of the app's screens gliding past in 3D, each one live.
 */
export default function AppTour() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [focused, setFocused] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const [phase, setPhase] = useState<'layers' | 'tour'>('layers')

  // Phase 1: apart, then assembling upright. Phase 2: the tour.
  const scrollSpread = useTransform(p, [0, HOLD, ASSEMBLED], [1, 1, 0])
  const stillSpread = useMotionValue(0.85)
  const spread = reduced ? stillSpread : scrollSpread
  const raw = useTransform(p, [TOUR_FROM, TOUR_TO], [0, NAMES.length - 1], { clamp: true })
  const tour = useTransform(raw, dwell)
  const jump = useMotionValue(0)
  const at = useSpring(reduced ? jump : tour, { stiffness: 220, damping: 32 })
  // The assembled phone and the first screen are drawn identically, so the handoff is a crossfade nobody sees.
  const stackOpacity = useTransform(p, [ASSEMBLED, HANDOFF], [1, 0])
  const coverOpacity = useTransform(p, [ASSEMBLED, HANDOFF], [0, 1])
  const stackY = useTransform(p, [0, HOLD, ASSEMBLED], ['6vh', '6vh', '0vh'])

  // Drag sideways to spin the stack; it springs to wherever you leave it.
  const spin = useMotionValue(0)
  const spinSpring = useSpring(spin, { stiffness: 120, damping: 18 })
  // Tilted while apart; upright and facing you once assembled. Any spin unwinds as it assembles.
  const baseZ = useTransform(p, [0, HOLD, ASSEMBLED], [-38, -32, 0])
  const spinWeight = useTransform(p, [HOLD, ASSEMBLED], [1, 0])
  const rotateZ = useTransform([baseZ, spinSpring, spinWeight], ([b, sp, w]: number[]) => b + sp * w)
  const rotateX = useTransform(p, [0, HOLD, ASSEMBLED], [58, 52, 0])
  const drag = useRef<{ x: number; spin: number } | null>(null)
  const down = (e: PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, spin: spin.get() }
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) spin.set(drag.current.spin + (e.clientX - drag.current.x) * 0.35)
  }
  const up = () => {
    drag.current = null
  }

  useMotionValueEvent(p, 'change', (v) => setPhase(v < HANDOFF ? 'layers' : 'tour'))

  // One phone size for both the stack and the screens, fitted to the window, so they line up exactly.
  const stage = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = stage.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const fit = () => {
      const narrow = el.clientWidth < 760
      const pw = Math.min(narrow ? el.clientWidth * 0.68 : 300, (el.clientHeight - (narrow ? 230 : 200)) * 0.445)
      el.style.setProperty('--pw', String(Math.round(pw)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useMotionValueEvent(tour, 'change', (v) => setActive(Math.round(v)))

  /** Tabs scroll the page to that screen's spot in the tour (or jump straight there with reduced motion). */
  const go = (i: number) => {
    setActive(i)
    jump.set(i)
    const el = ref.current
    if (!el || reduced) return
    const span = el.offsetHeight - window.innerHeight
    const top = el.getBoundingClientRect().top + window.scrollY + (TOUR_FROM + (i / (NAMES.length - 1)) * (TOUR_TO - TOUR_FROM)) * span
    window.scrollTo?.({ top, behavior: 'smooth' })
  }
  const open = (name: string) => go(NAMES.indexOf(name))

  return (
    <section ref={ref} className={[css.tour, reduced ? css.still : ''].join(' ')} aria-labelledby="tour-title">
      <div ref={stage} className={css.stage}>
        <div className={css.light} aria-hidden="true" />
        <div className={css.floor} aria-hidden="true" />
        <SectionHeading id="tour-title" className={css.title}>
          The whole app, <span className="pink">in your hand</span>.
        </SectionHeading>

        <motion.div className={css.layers} style={reduced ? undefined : { opacity: stackOpacity, y: stackY }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <ExplodedPhone spread={spread} rotateX={rotateX} rotateZ={rotateZ} focused={focused} />
        </motion.div>

        <div className={css.layerNames} role="group" aria-label="Layers of the viewfinder" data-hidden={phase === 'tour'}>
          {[...LAYERS].reverse().map((l) => {
            const i = LAYERS.indexOf(l)
            return (
              <button
                key={l.name}
                type="button"
                className="focusable"
                aria-pressed={focused === i}
                onMouseEnter={() => setFocused(i)}
                onMouseLeave={() => setFocused(null)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused(null)}
                onClick={() => setFocused(i)}
              >
                {l.name}
              </button>
            )
          })}
        </div>

        <motion.div className={css.covers} style={reduced ? undefined : { opacity: coverOpacity }} data-phase={phase}>
          {NAMES.map((name, i) => {
            const s = screenFor(name, open)
            return (
              <Cover key={name} i={i} at={at} flat={reduced}>
                <AppPhone statusBar={s.statusBar} className={css.phone}>
                  {s.node}
                </AppPhone>
              </Cover>
            )
          })}
        </motion.div>

        <div className={css.tabs} role="tablist" aria-label="App screens">
          {NAMES.map((name, i) => (
            <button key={name} type="button" role="tab" aria-selected={i === active} className="focusable" onClick={() => go(i)}>
              {name}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
