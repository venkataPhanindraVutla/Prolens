import type { ReactNode } from 'react'

/** The viewfinder's drawing space: overlays use these units so they line up with the photo. */
export interface Frame {
  w: number
  h: number
}

/** What each story chapter hands the viewfinder and the scrolling text. */
export interface Chapter {
  id: string
  title: ReactNode
  body: string
  /** The photograph on screen, credited under the chapter. */
  photoId: string
  /** The camera readout along the top of the viewfinder. */
  hud: string
  /** The mode lit in the viewfinder's mode strip. */
  mode?: string
  screen: (frame: Frame) => ReactNode
  controls: ReactNode
}
