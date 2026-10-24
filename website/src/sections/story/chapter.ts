import type { ReactNode } from 'react'

/** What each story chapter hands the pinned phone and the scrolling text. */
export interface Chapter {
  id: string
  title: ReactNode
  body: string
  screen: ReactNode
  controls: ReactNode
}
