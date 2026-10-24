import { useEffect, useRef, type ReactNode } from 'react'
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

export default function AppPhone({ children, statusBar, className }: Props) {
  const screen = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = screen.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => el.style.setProperty('--s', String(e.contentRect.width / DEVICE_W)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
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
