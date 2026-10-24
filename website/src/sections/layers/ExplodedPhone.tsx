import { motion, useTransform, type MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import AppViewfinder from '../../app-ui/AppViewfinder'
import GridOverlay from '../../components/GridOverlay'
import Photo from '../../components/Photo'
import { histogram } from '../../lib/analysis'
import ui from '../../app-ui/app.module.css'
import css from './ExplodedPhone.module.css'

const HIST = histogram(Uint8Array.from({ length: 4096 }, (_, i) => Math.round(40 + 60 * Math.sin(i / 300) ** 2 + (i % 7) * 18 + (i > 3000 ? 110 : 0)) % 256))
const CHIPS = [{ text: 'Roll 0.0° · Pitch 0°', tone: 'success' as const }, { text: 'Eye level' }]

/** Bottom to top: what the app actually stacks on screen, as ViewfinderScreen.kt draws it. */
export const LAYERS: { name: string; screen: ReactNode }[] = [
  { name: 'Phone', screen: null },
  { name: 'Live preview', screen: <AppViewfinder layer="preview" preview={<Photo id="hero" sizes="320px" />} /> },
  { name: 'Composition grid', screen: <AppViewfinder layer="overlay" preview={null} overlay={<GridOverlay id="thirds" width={412} height={549} variant="app" />} histogram={null} /> },
  { name: 'Exposure readouts', screen: <AppViewfinder layer="overlay" preview={null} histogram={HIST} chips={CHIPS} /> },
  { name: 'Controls', screen: <AppViewfinder layer="chrome" preview={null} /> },
]

/** Gap between layers at full spread, in px. */
const GAP = 78

function Layer({ i, spread, lifted, dimmed, children }: { i: number; spread: MotionValue<number>; lifted: boolean; dimmed: boolean; children: ReactNode }) {
  const z = useTransform(spread, (s) => s * i * GAP)
  const body = i === 0
  return (
    <motion.div className={css.layer} style={{ z }} data-layer={LAYERS[i].name} data-lifted={lifted}>
      <div className={[css.pane, body ? css.body : '', lifted ? css.lifted : '', dimmed ? css.dimmed : ''].join(' ')}>
        <div className={`${ui.device} ${ui.app}`} style={{ background: body ? undefined : 'transparent' }}>
          {children}
        </div>
      </div>
    </motion.div>
  )
}

interface Props {
  /** 0 assembled, 1 fully apart. */
  spread: MotionValue<number>
  rotateX: MotionValue<number>
  rotateZ: MotionValue<number>
  /** The layer lifted out of the stack, if any. */
  focused: number | null
}

/** The viewfinder pulled apart into the layers it draws, floating in 3D. */
export default function ExplodedPhone({ spread, rotateX, rotateZ, focused }: Props) {
  return (
    <motion.div className={css.stack} style={{ rotateX, rotateZ }} aria-hidden="true">
      {LAYERS.map((l, i) => (
        <Layer key={l.name} i={i} spread={spread} lifted={focused === i} dimmed={focused !== null && focused !== i}>
          {l.screen}
        </Layer>
      ))}
    </motion.div>
  )
}
