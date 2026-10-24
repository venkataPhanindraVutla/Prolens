import type { ReactNode } from 'react'
import { MODE_LABELS } from '../../lib/profiles'
import type { Frame } from './chapter'
import vf from './Viewfinder.module.css'

/** Wide screens hold the phone sideways, like a camera; phones get a full-width 4:5 viewfinder. */
export const WIDE_FRAME: Frame = { w: 1950, h: 900 }
export const TALL_FRAME: Frame = { w: 1000, h: 1250 }

interface Props {
  wide: boolean
  hud: string
  mode?: string
  children: ReactNode
}

export default function Viewfinder({ wide, hud, mode = 'Photo', children }: Props) {
  return (
    <div className={wide ? vf.phone : vf.bare}>
      <div className={vf.screen}>
        {children}
        <div className={`${vf.hud} mono`} aria-hidden="true">
          {hud}
        </div>
        <div className={vf.corners} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        {wide && (
          <div className={vf.controls} aria-hidden="true">
            <ul className={`${vf.modes} mono`}>
              {MODE_LABELS.map((m) => (
                <li key={m} className={m === mode ? vf.on : ''}>
                  {m}
                </li>
              ))}
            </ul>
            <span className={vf.shutter} />
          </div>
        )}
      </div>
    </div>
  )
}
