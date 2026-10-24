import { useEffect, useRef, useState, type ReactNode } from 'react'
import AppPhone from '../../app-ui/AppPhone'
import { AppCalculators, AppCoach, AppGear, AppLightScreen, AppToolkit } from '../../app-ui/AppScreens'
import AppViewfinder from '../../app-ui/AppViewfinder'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import SectionHeading from '../../components/SectionHeading'
import { histogram } from '../../lib/analysis'
import css from './AppTour.module.css'

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

/** Every screen of the app, swipeable, with tabs that follow the swipe. */
export default function AppTour() {
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLElement | null)[]>([])

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
        <p className="lede">Swipe through every screen, drawn from the app’s own code.</p>
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
            <AppPhone statusBar={s.statusBar} className={css.phone}>
              {s.screen}
            </AppPhone>
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
