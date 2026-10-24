import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { useReducedMotion } from '../../lib/motion'
import { useRef, type ReactNode } from 'react'
import AppViewfinder from '../../app-ui/AppViewfinder'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { histogram } from '../../lib/analysis'
import ui from '../../app-ui/app.module.css'
import css from './ExplodedPhone.module.css'

const HIST = histogram(Uint8Array.from({ length: 4096 }, (_, i) => Math.round(40 + 60 * Math.sin(i / 300) ** 2 + (i % 7) * 18 + (i > 3000 ? 110 : 0)) % 256))
const PREVIEW = <Photo id="hero" sizes="320px" />
const CHIPS = [{ text: 'Roll 0.0° · Pitch 0°', tone: 'success' as const }, { text: 'Eye level' }]

/** Bottom to top: what the app actually stacks on screen, as ViewfinderScreen.kt draws it. */
const LAYERS: { name: string; note: string; screen: ReactNode }[] = [
  { name: 'Phone', note: 'The body and its glass.', screen: null },
  { name: 'Live preview', note: 'The camera feed, cropped to your aspect ratio.', screen: <AppViewfinder layer="preview" preview={PREVIEW} /> },
  {
    name: 'Composition grid',
    note: 'Any of the 23 grids, in white over a soft shadow line.',
    screen: <AppViewfinder layer="overlay" preview={null} overlay={<GridOverlay id="thirds" width={412} height={549} variant="app" />} histogram={null} />,
  },
  { name: 'Exposure readouts', note: 'Histogram, level and angle, live.', screen: <AppViewfinder layer="overlay" preview={null} histogram={HIST} chips={CHIPS} /> },
  { name: 'Controls', note: 'Tools, zoom, the exposure HUD, modes and the shutter.', screen: <AppViewfinder layer="chrome" preview={null} /> },
]

/** Gap between layers at full spread, in px. */
const GAP = 64

function Layer({ i, spread, children, body }: { i: number; spread: MotionValue<number>; children: ReactNode; body?: boolean }) {
  const z = useTransform(spread, (s) => s * i * GAP)
  return (
    <motion.div className={[css.layer, body ? css.body : ''].join(' ')} style={{ z }}>
      <div className={`${ui.device} ${ui.app}`} style={{ background: body ? undefined : 'transparent' }}>
        {children}
      </div>
    </motion.div>
  )
}

/** The viewfinder pulled apart into its layers in 3D, spreading as it scrolls through the window and settling back. */
export default function ExplodedPhone() {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const live = useTransform(scrollYProgress, [0.1, 0.42, 0.62, 0.95], [0.05, 1, 1, 0.2])
  const still = useTransform(scrollYProgress, () => 0.85)
  const spread = reduced ? still : live
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [54, 54, 54] : [62, 54, 44])
  const rotateZ = useTransform(scrollYProgress, [0, 0.5, 1], reduced ? [-32, -32, -32] : [-40, -32, -24])
  const labelOpacity = useTransform(spread, [0.3, 0.8], [0, 1])

  return (
    <div ref={ref} className={css.wrap}>
      <div className={css.stage} aria-hidden="true">
        <motion.div className={css.stack} style={{ rotateX, rotateZ }}>
          {LAYERS.map((l, i) => (
            <Layer key={l.name} i={i} spread={spread} body={i === 0}>
              {l.screen}
            </Layer>
          ))}
        </motion.div>
      </div>
      <motion.ol className={css.labels} style={{ opacity: labelOpacity }} aria-label="Layers of the viewfinder">
        {[...LAYERS].reverse().map((l) => (
          <li key={l.name}>
            <b>{l.name}</b>
            <span>{l.note}</span>
          </li>
        ))}
      </motion.ol>
    </div>
  )
}

