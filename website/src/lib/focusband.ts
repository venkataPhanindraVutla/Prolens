/**
 * Where a depth-of-field zone falls on a photo of the ground running away from the camera.
 * On flat ground, a point's height below the horizon in the frame falls off as 1 / distance,
 * and everything above the horizon is effectively at infinity.
 */

/** Horizon height in the depth-of-field photo (the Iceland road), as a fraction from the top. */
export const HORIZON = 0.42
/** Distance, in mm, that sits on the bottom edge of the frame. */
export const NEAR_EDGE_MM = 1500

/** Frame row, 0 (top) to 1 (bottom), of ground at distance mm. */
export const rowAt = (mm: number) => HORIZON + (1 - HORIZON) * Math.min(1, NEAR_EDGE_MM / mm)

/** The sharp zone as percentages from the top: far limit to near limit. An infinite far limit reaches the sky. */
export function focusBand(nearMm: number, farMm: number): { top: number; bottom: number } {
  const top = Number.isFinite(farMm) ? rowAt(farMm) * 100 : 0
  const bottom = rowAt(nearMm) * 100
  return { top: Math.max(0, Math.min(100, top)), bottom: Math.max(0, Math.min(100, bottom)) }
}

/** Blur outside the zone, in px: longer lenses and wider apertures blur more, as they do. */
export const blurPx = (focalMm: number, n: number) => Math.max(0.6, Math.min(14, (focalMm * focalMm) / (n * 140)))
