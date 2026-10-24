/** Three made-up phones that show how Prolens adapts. Generic on purpose: no real models are named. */

export interface Lens {
  role: 'Ultra-wide' | 'Wide' | 'Telephoto' | 'Front'
  zoom: number
  mm: number
  mp: number
  focusFromCm: number | null
}

export interface PhoneProfile {
  id: string
  name: string
  note?: string
  lenses: Lens[]
  manual: boolean
  night: 'phone' | 'prolens'
  sloMoFps: number[]
  portraitBlur: boolean
}

export const PROFILES: PhoneProfile[] = [
  {
    id: 'one-camera',
    name: 'One camera',
    lenses: [
      { role: 'Wide', zoom: 1, mm: 26, mp: 50, focusFromCm: 10 },
      { role: 'Front', zoom: 1, mm: 24, mp: 8, focusFromCm: null },
    ],
    manual: false,
    night: 'prolens',
    sloMoFps: [],
    portraitBlur: false,
  },
  {
    id: 'hidden-uw',
    name: 'Hidden ultra-wide',
    note: 'This phone has a 0.6× camera, but doesn’t share it with apps. Prolens only offers what it can use.',
    lenses: [
      { role: 'Wide', zoom: 1, mm: 24, mp: 50, focusFromCm: 8 },
      { role: 'Front', zoom: 1, mm: 22, mp: 16, focusFromCm: null },
    ],
    manual: true,
    night: 'prolens',
    sloMoFps: [120],
    portraitBlur: false,
  },
  {
    id: 'three-camera',
    name: 'Three cameras',
    lenses: [
      { role: 'Ultra-wide', zoom: 0.6, mm: 14, mp: 50, focusFromCm: 3 },
      { role: 'Wide', zoom: 1, mm: 23, mp: 50, focusFromCm: 10 },
      { role: 'Telephoto', zoom: 3, mm: 70, mp: 12, focusFromCm: 35 },
      { role: 'Front', zoom: 1, mm: 21, mp: 32, focusFromCm: null },
    ],
    manual: true,
    night: 'phone',
    sloMoFps: [120, 240],
    portraitBlur: true,
  },
]

/** The app's strip order (core/model/Modes.kt). */
export const MODE_LABELS = ['Night', 'Micro', 'Macro', 'Photo', 'Slo-mo', 'Pano', 'Templates']

/** Like availableModes in the app: Slo-mo only when the phone records high frame rates. */
export function modesFor(p: PhoneProfile): string[] {
  return MODE_LABELS.filter((m) => m !== 'Slo-mo' || p.sloMoFps.length > 0)
}

/** How far the photo zooms in for a lens, relative to the widest lens on offer. */
export const zoomScale = (zoom: number, widest: number) => zoom / widest
