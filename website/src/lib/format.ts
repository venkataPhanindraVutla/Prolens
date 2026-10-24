/** Photographer units, ported from PhotoFormat in core/photomath/PhotoMath.kt. Outputs match the app exactly. */

/** Fixed decimals, rounding half up like Kotlin's roundToInt. */
export function fixed(v: number, decimals: number): string {
  const p = 10 ** decimals
  const r = Math.round(Math.abs(v) * p)
  const whole = Math.floor(r / p)
  const frac = r % p
  const sign = v < 0 && r !== 0 ? '-' : ''
  return decimals === 0 ? `${sign}${whole}` : `${sign}${whole}.${String(frac).padStart(decimals, '0')}`
}

/** Like fixed(), but drops trailing zeros: 2.80 → 2.8, 8.0 → 8. */
export function trim(v: number, decimals: number): string {
  const s = fixed(v, decimals)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

export function shutter(t: number): string {
  if (!Number.isFinite(t)) return '—'
  if (t >= 60) {
    const m = Math.floor(t / 60)
    const s = Math.round(t % 60)
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  if (t >= 0.3) return `${trim(t, t < 10 ? 1 : 0)}s`
  return `1/${Math.round(1 / t)}`
}

export const aperture = (n: number) => `f/${trim(n, 1)}`

/** mm in, the unit a photographer would say out loud. */
export function distance(mm: number): string {
  if (!Number.isFinite(mm)) return '∞'
  if (mm < 10) return `${fixed(mm, 1)} mm`
  if (mm < 1000) return `${Math.round(mm / 10)} cm`
  return `${fixed(mm / 1000, mm < 10000 ? 2 : 1)} m`
}

export const ev = (v: number) => `${v > 0 ? '+' : ''}${trim(v, 1)} EV`
