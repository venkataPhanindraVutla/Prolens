import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useReducedMotion } from '../../lib/motion'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import AppPhone from '../../app-ui/AppPhone'
import { AppCalculators, AppCoach, AppGear, AppLightScreen, AppToolkit } from '../../app-ui/AppScreens'
import AppViewfinder from '../../app-ui/AppViewfinder'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import SectionHeading from '../../components/SectionHeading'
import { histogram } from '../../lib/analysis'
import css from './AppTour.module.css'
import ExplodedPhone from './ExplodedPhone'

/** A plausible histogram for the viewfinder shot: a sunset's dark water and bright sky. */
const SAMPLE_HISTOGRAM = histogram(Uint8Array.from({ length: 4096 }, (_, i) => Math.round(40 + 60 * Math.sin(i / 300) ** 2 + (i % 7) * 18 + (i > 3000 ? 110 : 0)) % 256))

const SCREENS: { name: string; caption: string; statusBar?: boolean; screen: ReactNode }[] = [
  {
    name: 'Viewfinder',
    caption: 'Full screen, no tab bar: tools along the top, zoom, the exposure HUD, modes and the shutter.',
    screen: (
      <AppViewfinder
        preview={<Photo id="hero" sizes="300px" />}
        overlay={<GridOverlay id="thirds" width={412} height={549} variant="app" />}
        histogram={SAMPLE_HISTOGRAM}
        chips={[{ text: 'Roll 0.0° · Pitch 0°', tone: 'success' }, { text: 'Eye level' }]}
      />
    ),
  },
  { name: 'Toolkit', caption: 'One tap from the viewfinder: calculators, light, coach and your gear.', statusBar: true, screen: <AppToolkit /> },
  { name: 'Calculators', caption: 'Depth of field, blur, exposure, ND, astro, field of view and flash, for your own camera.', statusBar: true, screen: <AppCalculators /> },
  { name: 'Light', caption: 'Golden and blue hour, the sun’s path and direction, and the moon, offline.', statusBar: true, screen: <AppLightScreen /> },
  { name: 'Coach', caption: 'Fifteen genre recipes, camera angles, lighting patterns and composition.', statusBar: true, screen: <AppCoach /> },
  { name: 'Gear', caption: 'Your bodies and lenses, and what this phone’s cameras can do.', statusBar: true, screen: <AppGear /> },
]

/**
 * A cover-flow card: turns away and steps back the further it sits from the middle of the strip.
 * offset is in card widths from the centre, recomputed from the strip's scroll position.
 */
function Cover({ scrollX, center, span, view, reduced, children }: { scrollX: MotionValue<number>; center: number; span: number; view: number; reduced: boolean; children: ReactNode }) {
  const off = useTransform(scrollX, (x) => (span ? (center - (x + view / 2)) / span : 0))
  const rotateY = useTransform(off, (o) => Math.max(-48, Math.min(48, -o * 34)))
  const z = useTransform(off, (o) => -Math.min(Math.abs(o), 2.5) * 150)
  const opacity = useTransform(off, (o) => 1 - Math.min(Math.abs(o), 2) * 0.28)
  return (
    <motion.div data-3d className={css.cover} style={reduced ? undefined : { rotateY, z, opacity }}>
      {children}
    </motion.div>
  )
}

/** Every screen of the app, swipeable in 3D, with tabs that follow the swipe. */
export default function AppTour() {
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLElement | null)[]>([])
  const { scrollX } = useScroll({ container: track })
  const [geo, setGeo] = useState({ centers: [] as number[], span: 0, view: 0 })
  useLayoutEffect(() => {
    const root = track.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const measure = () => {
      const els = items.current.filter(Boolean) as HTMLElement[]
      setGeo({
        centers: els.map((el) => el.offsetLeft + el.offsetWidth / 2),
        span: els.length > 1 ? els[1].offsetLeft - els[0].offsetLeft : 1,
        view: root.clientWidth,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // The lit phone is whichever sits nearest the middle of the strip, however many are in view.
  useEffect(() => {
    const root = track.current
    if (!root) return
    let frame = 0
    const pick = () => {
      frame = 0
      const mid = root.getBoundingClientRect().left + root.clientWidth / 2
      let best = 0
      let bestD = Infinity
      items.current.forEach((el, i) => {
        if (!el) return
        const r = el.getBoundingClientRect()
        const d = Math.abs(r.left + r.width / 2 - mid)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      setActive(best)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(pick)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const go = (i: number) => {
    setActive(i)
    items.current[i]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <section className={css.tour} aria-labelledby="tour-title">
      <div className={`section ${css.head}`}>
        <SectionHeading id="tour-title" className="display">
          The whole app, <span className="pink">in your hand</span>.
        </SectionHeading>
        <p className="lede">Pulled apart into the layers it draws, then every screen, drawn from the app’s own code.</p>
      </div>
      <ExplodedPhone />
      <div className={`section ${css.head} ${css.tabsHead}`}>
        <div className={css.tabs} role="tablist" aria-label="App screens">
          {SCREENS.map((s, i) => (
            <button key={s.name} type="button" role="tab" aria-selected={i === active} aria-controls={`tour-${i}`} className="focusable" onClick={() => go(i)}>
              {s.name}
            </button>
          ))}
        </div>
      </div>
      <div ref={track} className={css.track}>
        {SCREENS.map((s, i) => (
          <div
            key={s.name}
            id={`tour-${i}`}
            ref={(el) => {
              items.current[i] = el
            }}
            data-index={i}
            className={[css.item, i === active ? css.on : ''].join(' ')}
            role="tabpanel"
            aria-label={s.name}
          >
            <Cover scrollX={scrollX} center={geo.centers[i] ?? 0} span={geo.span} view={geo.view} reduced={reduced}>
              <AppPhone statusBar={s.statusBar} className={css.phone}>
                {s.screen}
              </AppPhone>
            </Cover>
            <p className={css.caption}>
              <b>{s.name}</b>
              <span>{s.caption}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
