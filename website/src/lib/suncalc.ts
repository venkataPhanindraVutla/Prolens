/*
 * Sun maths, ported from SunCalc (https://github.com/mourner/suncalc).
 * Copyright (c) 2011-2015, Vladimir Agafonkin. BSD-2-Clause licence.
 * Redistribution and use in source and binary forms, with or without modification, are permitted
 * provided the copyright notice and this condition are retained. Provided "as is", without warranty.
 * Adapted: degrees in the public API, azimuth 0 = north clockwise, null instead of NaN times,
 * extra twilight bands. Times are epoch milliseconds; callers own time zones and local days.
 */

export interface SkyPosition {
  azimuth: number
  altitude: number
}

export interface SunTimes {
  solarNoon: number
  sunrise: number | null
  sunset: number | null
  goldenMorningStart: number | null
  goldenMorningEnd: number | null
  goldenEveningStart: number | null
  goldenEveningEnd: number | null
  blueMorningStart: number | null
  blueMorningEnd: number | null
  blueEveningStart: number | null
  blueEveningEnd: number | null
  civilDawn: number | null
  civilDusk: number | null
  nauticalDawn: number | null
  nauticalDusk: number | null
  astroDawn: number | null
  astroDusk: number | null
}

export type LightPhase = 'Night' | 'Astro' | 'Nautical' | 'Blue' | 'Golden' | 'Day'

/** Bands by the sun centre's altitude: day > 6°, golden −4..6, blue −6..−4, nautical −12..−6, astro −18..−12. */
export function lightPhase(altitude: number): LightPhase {
  if (altitude > 6) return 'Day'
  if (altitude >= -4) return 'Golden'
  if (altitude >= -6) return 'Blue'
  if (altitude >= -12) return 'Nautical'
  if (altitude >= -18) return 'Astro'
  return 'Night'
}

const { PI, sin, cos, tan, asin, acos, atan2 } = Math
const RAD = PI / 180
const DEG = 180 / PI
const DAY_MS = 86_400_000
const J1970 = 2440588
const J2000 = 2451545
const J0 = 0.0009
const E = RAD * 23.4397

const toJulian = (ms: number) => ms / DAY_MS - 0.5 + J1970
const fromJulian = (j: number) => Math.round((j + 0.5 - J1970) * DAY_MS)
const toDays = (ms: number) => toJulian(ms) - J2000

const rightAscension = (l: number, b: number) => atan2(sin(l) * cos(E) - tan(b) * sin(E), cos(l))
const declination = (l: number, b: number) => asin(sin(b) * cos(E) + cos(b) * sin(E) * sin(l))
const azimuthRad = (h: number, phi: number, dec: number) => atan2(sin(h), cos(h) * sin(phi) - tan(dec) * cos(phi))
const altitudeRad = (h: number, phi: number, dec: number) => asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h))
const siderealTime = (d: number, lw: number) => RAD * (280.16 + 360.9856235 * d) - lw

const solarMeanAnomaly = (d: number) => RAD * (357.5291 + 0.98560028 * d)
function eclipticLongitude(m: number) {
  const c = RAD * (1.9148 * sin(m) + 0.02 * sin(2 * m) + 0.0003 * sin(3 * m))
  return m + c + RAD * 102.9372 + PI
}
function sunCoords(d: number) {
  const l = eclipticLongitude(solarMeanAnomaly(d))
  return { dec: declination(l, 0), ra: rightAscension(l, 0) }
}

const julianCycle = (d: number, lw: number) => Math.round(d - J0 - lw / (2 * PI))
const approxTransit = (ht: number, lw: number, n: number) => J0 + (ht + lw) / (2 * PI) + n
const solarTransitJ = (ds: number, m: number, l: number) => J2000 + ds + 0.0053 * sin(m) - 0.0069 * sin(2 * l)
const hourAngle = (h: number, phi: number, d: number) => acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d)))

const norm360 = (x: number) => ((x % 360) + 360) % 360

export function sunPosition(epochMs: number, lat: number, lon: number): SkyPosition {
  const lw = RAD * -lon
  const phi = RAD * lat
  const d = toDays(epochMs)
  const c = sunCoords(d)
  const h = siderealTime(d, lw) - c.ra
  return { azimuth: norm360(azimuthRad(h, phi, c.dec) * DEG + 180), altitude: altitudeRad(h, phi, c.dec) * DEG }
}

/** Times for the day whose local noon is noonEpochMs. */
export function sunTimes(noonEpochMs: number, lat: number, lon: number): SunTimes {
  const lw = RAD * -lon
  const phi = RAD * lat
  const d = toDays(noonEpochMs)
  const n = julianCycle(d, lw)
  const ds = approxTransit(0, lw, n)
  const m = solarMeanAnomaly(ds)
  const l = eclipticLongitude(m)
  const dec = declination(l, 0)
  const jNoon = solarTransitJ(ds, m, l)
  const at = (angle: number, rising: boolean): number | null => {
    const w = hourAngle(angle * RAD, phi, dec)
    if (Number.isNaN(w)) return null
    const jSet = solarTransitJ(approxTransit(w, lw, n), m, l)
    return fromJulian(rising ? jNoon - (jSet - jNoon) : jSet)
  }
  return {
    solarNoon: fromJulian(jNoon),
    sunrise: at(-0.833, true),
    sunset: at(-0.833, false),
    goldenMorningStart: at(-4, true),
    goldenMorningEnd: at(6, true),
    goldenEveningStart: at(6, false),
    goldenEveningEnd: at(-4, false),
    blueMorningStart: at(-6, true),
    blueMorningEnd: at(-4, true),
    blueEveningStart: at(-4, false),
    blueEveningEnd: at(-6, false),
    civilDawn: at(-6, true),
    civilDusk: at(-6, false),
    nauticalDawn: at(-12, true),
    nauticalDusk: at(-12, false),
    astroDawn: at(-18, true),
    astroDusk: at(-18, false),
  }
}
