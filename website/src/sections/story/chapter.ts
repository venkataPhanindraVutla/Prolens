import type { ReactNode } from 'react'

/** The app's viewfinder preview is 412 × 549 (3:4 at the device's 412 dp width). */
export const PREVIEW = { w: 412, h: 549 }

/** What each story chapter hands the pinned phone and the scrolling text. */
export interface Chapter {
  id: string
  title: ReactNode
  body: string
  /** The photograph on screen, credited under the chapter; none for app screens. */
  photoId?: string
  /** What the phone shows: the app's viewfinder or one of its screens. */
  phone: ReactNode
  /** Non-camera screens show the status bar. */
  statusBar?: boolean
  controls: ReactNode
}
