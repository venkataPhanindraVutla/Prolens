/** Exposure tools, ported from features/viewfinder/Analysis.kt. Frames are row-major luma, one byte per pixel. */

export const HIST_BINS = 64

/** Rec.601 luma from RGBA pixels. */
export function luma(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4)
  for (let i = 0; i < out.length; i++) {
    const j = i * 4
    out[i] = Math.round(0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2])
  }
  return out
}

export function histogram(l: Uint8Array): number[] {
  const bins = new Array<number>(HIST_BINS).fill(0)
  for (const v of l) bins[Math.min(HIST_BINS - 1, v >> 2)]++
  return bins
}

/** Diagonal white stripes over luma at or above levelPct. */
export function zebra(l: Uint8Array, w: number, h: number, levelPct = 95): Uint8ClampedArray {
  const lvl = (levelPct / 100) * 255
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (Math.floor((x + y) / 3) % 2 === 0 && l[i] >= lvl) out.set([255, 255, 255, 204], i * 4)
    }
  return out
}

const FC_STOPS = [3, 10, 20, 40, 48, 52, 58, 90, 97, 101]
/** null bands are grey and keep the scene's brightness. */
const FC_COLORS: ([number, number, number] | null)[] = [
  [124, 58, 237], [37, 99, 235], [13, 148, 136], null, [22, 163, 74], null, [244, 114, 182], null, [250, 204, 21], [239, 68, 68],
]

export function falseColor(v: number): [number, number, number] {
  const pct = (v / 255) * 100
  for (let i = 0; i < FC_STOPS.length; i++)
    if (pct < FC_STOPS[i]) {
      const c = FC_COLORS[i]
      if (c) return c
      const g = Math.floor(v * 0.8)
      return [g, g, g]
    }
  return [239, 68, 68]
}

/** Sobel edge strength |gx| + |gy|, painted red where it beats the threshold (the app's medium sensitivity). */
export function peaking(l: Uint8Array, w: number, h: number, threshold = 240): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      const gx = -l[i - w - 1] - 2 * l[i - 1] - l[i + w - 1] + l[i - w + 1] + 2 * l[i + 1] + l[i + w + 1]
      const gy = -l[i - w - 1] - 2 * l[i - w] - l[i - w + 1] + l[i + w - 1] + 2 * l[i + w] + l[i + w + 1]
      if (Math.abs(gx) + Math.abs(gy) > threshold) out.set([239, 68, 68, 235], i * 4)
    }
  return out
}
