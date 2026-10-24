import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import ui from './app.module.css'

/** The app is drawn at its real size (412 × 892 dp) and scaled to the phone's width, so every dp in the spec is a px here. */
export const DEVICE_W = 412
export const DEVICE_H = 892

interface Props {
  children: ReactNode
  /** Non-camera screens show the status bar; the viewfinder is immersive. */
  statusBar?: boolean
  className?: string
}

/** Keeps --s on the element at its width over the device's, so the 412 dp app inside fills it. */
function useDeviceScale(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => el.style.setProperty('--s', String(e.contentRect.width / DEVICE_W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
}

export default function AppPhone({ children, statusBar, className }: Props) {
  const screen = useRef<HTMLDivElement>(null)
  useDeviceScale(screen)
  return (
    <div className={[ui.phone, className ?? ''].join(' ')}>
      <div ref={screen} className={ui.phoneScreen}>
        <div className={`${ui.device} ${ui.app}`}>
          {statusBar && (
            <div className={ui.statusBar} aria-hidden="true">
              <span>9:41</span>
              <span className={ui.statusIcons}>
                <i />
                <i />
                <b />
              </span>
            </div>
          )}
          {children}
        </div>
        <span className={ui.island} aria-hidden="true" />
      </div>
    </div>
  )
}

interface CropProps {
  children: ReactNode
  /** The band of the screen to show, in dp from the top. */
  from: number
  to: number
  className?: string
}

/**
 * A band of the app's screen with no phone around it, as wide as its container.
 * For phones, where a whole phone drawn at 300 px makes the app's own type too small to read.
 */
export function AppCrop({ children, from, to, className }: CropProps) {
  const box = useRef<HTMLDivElement>(null)
  useDeviceScale(box)
  return (
    <div ref={box} className={[ui.crop, className ?? ''].join(' ')} style={{ aspectRatio: `${DEVICE_W} / ${to - from}` }}>
      <div className={`${ui.device} ${ui.app}`} style={{ top: `calc(${-from}px * var(--s))` }}>
        {children}
      </div>
    </div>
  )
}
