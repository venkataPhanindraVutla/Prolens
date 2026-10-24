/**
 * Depth-of-field maths, ported from core/photomath/PhotoMath.kt.
 * Focal length and sensor sizes in mm, distances in mm, N is the f-number.
 */

export interface Sensor {
  id: string
  name: string
  w: number
  h: number
  mp: number
}

/** From the app's body presets: Sony A7 IV, Fujifilm X-T5, and the phone main camera. */
export const SENSORS: Sensor[] = [
  { id: 'ff', name: 'Full frame', w: 35.9, h: 23.9, mp: 33 },
  { id: 'apsc', name: 'APS-C', w: 23.5, h: 15.6, mp: 40.2 },
  { id: 'phone', name: 'Phone main camera', w: 9.6, h: 7.2, mp: 50 },
]

const FF_DIAG = 43.267

const diag = (s: Sensor) => Math.hypot(s.w, s.h)
export const cropFactor = (s: Sensor) => FF_DIAG / diag(s)
/** Circle of confusion, mm. */
export const coc = (s: Sensor) => diag(s) / 1500

export const hyperfocal = (f: number, n: number, c: number) => (f * f) / (n * c) + f

export interface Dof {
  hyperfocal: number
  near: number
  far: number
  total: number
}

/** s in mm. far is Infinity at or past the hyperfocal distance. */
export function dof(f: number, n: number, c: number, s: number): Dof {
  const h = hyperfocal(f, n, c)
  const near = (s * (h - f)) / (h + s - 2 * f)
  const far = s >= h ? Infinity : (s * (h - f)) / (h - s)
  return { hyperfocal: h, near, far, total: far - near }
}

export const APERTURES = [
  1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 9.0, 10.0, 11.0, 13.0,
  14.0, 16.0, 18.0, 20.0, 22.0, 32.0,
]

/** Nearest value on a scale, judged in stops (log distance). */
export function nearest(scale: number[], v: number): number {
  return scale.reduce((best, x) => (Math.abs(Math.log(x / v)) < Math.abs(Math.log(best / v)) ? x : best))
}
