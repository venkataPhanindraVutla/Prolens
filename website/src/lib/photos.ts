import { aperture, shutter, trim } from './format'
import data from './photos.data.json'

/** EXIF as Wikimedia Commons reports it: rationals like "80/10" or plain numbers, any of them missing. */
export interface Exif {
  Make?: string | null
  Model?: string | null
  FNumber?: string | number | null
  ExposureTime?: string | number | null
  ISOSpeedRatings?: string | number | null
  FocalLength?: string | number | null
  FocalLengthIn35mmFilm?: string | number | null
}

export interface Photo {
  id: string
  alt: string
  /** CSS object-position that keeps the subject in frame when cropped. */
  focus: string
  place: string
  title: string
  page: string
  artist: string
  license: string
  licenseUrl: string
  exif: Exif
  width: number
  height: number
  widths: number[]
  /** The photo's dominant colour, shown while it loads. */
  color: string
}

export const PHOTOS = data as Photo[]

export function photo(id: string): Photo {
  const p = PHOTOS.find((x) => x.id === id)
  if (!p) throw new Error(`No photo called ${id}`)
  return p
}

const url = (p: Photo, w: number) => `${import.meta.env.BASE_URL}photos/${p.id}-${w}.webp`
export const srcSet = (p: Photo) => p.widths.map((w) => `${url(p, w)} ${w}w`).join(', ')
export const src = (p: Photo, w = 1280) => url(p, p.widths.find((x) => x >= w) ?? p.widths[p.widths.length - 1])

/** "80/10" → 8 */
function num(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  const [a, b] = v.split('/').map(Number)
  const n = b ? a / b : a
  return Number.isFinite(n) ? n : null
}

const NOISE = new Set(['CORPORATION', 'CORP.', 'IMAGING', 'INC.', 'CO.', 'LTD.'])
const soften = (w: string) => (/^[A-Z]{4,}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w)

/** "NIKON CORPORATION" + "NIKON D750" → "Nikon D750"; "FUJIFILM" + "X-T1" → "Fujifilm X-T1". */
export function camera(e: Pick<Exif, 'Make' | 'Model'>): string {
  const model = (e.Model ?? '').trim()
  const make = (e.Make ?? '').split(/\s+/).filter((w) => w && !NOISE.has(w.toUpperCase())).map(soften).join(' ')
  const nice = model.split(/\s+/).map(soften).join(' ')
  if (!make || nice.toLowerCase().startsWith(make.split(' ')[0].toLowerCase())) return nice
  return `${make} ${nice}`.trim()
}

/** "Nikon D750 · 30 mm · f/8 · 1/320 · ISO 100", skipping whatever the file didn't record. */
export function exifLine(p: Photo): string {
  const e = p.exif
  const f = num(e.FocalLength)
  const n = num(e.FNumber)
  const t = num(e.ExposureTime)
  const iso = num(e.ISOSpeedRatings)
  return [camera(e), f && `${trim(f, 1)} mm`, n && aperture(n), t && shutter(t), iso && `ISO ${iso}`].filter(Boolean).join(' · ')
}

export const creditLine = (p: Photo) => `${p.artist}, ${p.license}`
