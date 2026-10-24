import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import AppPhone from '../../app-ui/AppPhone'
import { LiveCalculators, LiveCoach, LiveGear, LiveLight, LiveToolkit, LiveViewfinder } from '../../app-ui/live/LiveScreens'
import SectionHeading from '../../components/SectionHeading'
import { useReducedMotion } from '../../lib/motion'
import css from './AppTour.module.css'
import ExplodedPhone, { LAYERS } from './ExplodedPhone'

const NAMES = ['Viewfinder', 'Toolkit', 'Calculators', 'Light', 'Coach', 'Gear']

/** Scroll progress where the phone has finished assembling, and where the tour runs from and to. */
const ASSEMBLED = 0.26
const TOUR_FROM = 0.3
const TOUR_TO = 0.97

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

/** One phone in the cover-flow: centred faces you and takes taps; the rest turn away and step back. */
function Cover({ i, at, flat, children }: { i: number; at: MotionValue<number>; flat: boolean; children: ReactNode }) {
  const off = useTransform(at, (v) => i - v)
  const x = useTransform(off, (o) => `${o * 98}%`)
  const rotateY = useTransform(off, (o) => Math.max(-60, Math.min(60, -o * 44)))
  const z = useTransform(off, (o) => -Math.min(Math.abs(o), 3) * 240)
  const opacity = useTransform(off, (o) => Math.max(0, 1 - Math.abs(o) * 0.32))
  const pointerEvents = useTransform(off, (o) => (Math.abs(o) < 0.5 ? 'auto' : 'none'))
  return (
    <motion.div data-3d className={css.cover} style={flat ? undefined : { x, rotateY, z, opacity, pointerEvents }}>
      {children}
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

  // Phase 1: apart, then assembling. Phase 2: the tour.
  const scrollSpread = useTransform(p, [0, 0.1, ASSEMBLED], [1, 1, 0])
  const stillSpread = useMotionValue(0.85)
  const spread = reduced ? stillSpread : scrollSpread
  const tour = useTransform(p, [TOUR_FROM, TOUR_TO], [0, NAMES.length - 1], { clamp: true })
  const jump = useMotionValue(0)
  const at = useSpring(reduced ? jump : tour, { stiffness: 220, damping: 32 })
  const stackOpacity = useTransform(p, [ASSEMBLED, ASSEMBLED + 0.03], [1, 0])
  const coverOpacity = useTransform(p, [ASSEMBLED, ASSEMBLED + 0.03], [0, 1])

  // Drag sideways to spin the stack; it springs to wherever you leave it.
  const spin = useMotionValue(0)
  const spinSpring = useSpring(spin, { stiffness: 120, damping: 18 })
  const baseZ = useTransform(p, [0, ASSEMBLED], [-38, -20])
  const rotateZ = useTransform([baseZ, spinSpring], ([b, s]: number[]) => b + s)
  const rotateX = useTransform(p, [0, ASSEMBLED], [58, 30])
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

  useMotionValueEvent(p, 'change', (v) => setPhase(v < ASSEMBLED + 0.02 ? 'layers' : 'tour'))
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
      <div className={css.stage}>
        <div className={css.light} aria-hidden="true" />
        <div className={css.floor} aria-hidden="true" />
        <SectionHeading id="tour-title" className={css.title}>
          The whole app, <span className="pink">in your hand</span>.
        </SectionHeading>

        <motion.div className={css.layers} style={reduced ? undefined : { opacity: stackOpacity }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
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
