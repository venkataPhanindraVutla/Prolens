/*
 * Sun and moon maths, ported from SunCalc (https://github.com/mourner/suncalc).
 * Copyright (c) 2011-2015, Vladimir Agafonkin. BSD-2-Clause licence.
 * Redistribution and use in source and binary forms, with or without modification, are permitted
 * provided the copyright notice and this condition are retained. Provided "as is", without warranty.
 * Adapted: degrees in the public API, azimuth 0 = north clockwise, null instead of NaN times,
 * extra twilight bands. Times are epoch milliseconds; callers own time zones and local days.
 */
package `in`.venkat.prolens.core.sun

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.roundToLong
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan

data class SkyPosition(val azimuth: Double, val altitude: Double)

data class SunTimes(
    val solarNoon: Long,
    val sunrise: Long?, val sunset: Long?,
    val goldenMorningStart: Long?, val goldenMorningEnd: Long?,
    val goldenEveningStart: Long?, val goldenEveningEnd: Long?,
    val blueMorningStart: Long?, val blueMorningEnd: Long?,
    val blueEveningStart: Long?, val blueEveningEnd: Long?,
    val civilDawn: Long?, val civilDusk: Long?,
    val nauticalDawn: Long?, val nauticalDusk: Long?,
    val astroDawn: Long?, val astroDusk: Long?,
)

enum class LightPhase(val label: String) {
    Night("Night"), Astro("Astronomical twilight"), Nautical("Nautical twilight"),
    Blue("Blue hour"), Golden("Golden hour"), Day("Daylight");

    companion object {
        /** Bands by the sun centre's altitude: day > 6°, golden −4..6, blue −6..−4, nautical −12..−6, astro −18..−12. */
        fun of(altitude: Double) = when {
            altitude > 6 -> Day
            altitude >= -4 -> Golden
            altitude >= -6 -> Blue
            altitude >= -12 -> Nautical
            altitude >= -18 -> Astro
            else -> Night
        }
    }
}

data class MoonInfo(
    val azimuth: Double, val altitude: Double,
    val fraction: Double, val phase: Double, val phaseName: String,
    val rise: Long?, val set: Long?,
)

object SunCalc {
    private const val RAD = PI / 180
    private const val DEG = 180 / PI
    private const val DAY_MS = 86_400_000.0
    private const val J1970 = 2440588.0
    private const val J2000 = 2451545.0
    private const val J0 = 0.0009
    private val E = RAD * 23.4397

    private fun toJulian(ms: Long) = ms / DAY_MS - 0.5 + J1970
    private fun fromJulian(j: Double): Long = ((j + 0.5 - J1970) * DAY_MS).roundToLong()
    private fun toDays(ms: Long) = toJulian(ms) - J2000

    private fun rightAscension(l: Double, b: Double) = atan2(sin(l) * cos(E) - tan(b) * sin(E), cos(l))
    private fun declination(l: Double, b: Double) = asin(sin(b) * cos(E) + cos(b) * sin(E) * sin(l))
    private fun azimuthRad(h: Double, phi: Double, dec: Double) = atan2(sin(h), cos(h) * sin(phi) - tan(dec) * cos(phi))
    private fun altitudeRad(h: Double, phi: Double, dec: Double) = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(h))
    private fun siderealTime(d: Double, lw: Double) = RAD * (280.16 + 360.9856235 * d) - lw
    private fun astroRefraction(h0: Double): Double {
        val h = if (h0 < 0) 0.0 else h0
        return 0.0002967 / tan(h + 0.00312536 / (h + 0.08901179))
    }

    private fun solarMeanAnomaly(d: Double) = RAD * (357.5291 + 0.98560028 * d)
    private fun eclipticLongitude(m: Double): Double {
        val c = RAD * (1.9148 * sin(m) + 0.02 * sin(2 * m) + 0.0003 * sin(3 * m))
        return m + c + RAD * 102.9372 + PI
    }
    private data class Coords(val dec: Double, val ra: Double, val dist: Double = 0.0)
    private fun sunCoords(d: Double): Coords {
        val l = eclipticLongitude(solarMeanAnomaly(d))
        return Coords(declination(l, 0.0), rightAscension(l, 0.0))
    }

    private fun julianCycle(d: Double, lw: Double) = kotlin.math.round(d - J0 - lw / (2 * PI))
    private fun approxTransit(ht: Double, lw: Double, n: Double) = J0 + (ht + lw) / (2 * PI) + n
    private fun solarTransitJ(ds: Double, m: Double, l: Double) = J2000 + ds + 0.0053 * sin(m) - 0.0069 * sin(2 * l)
    private fun hourAngle(h: Double, phi: Double, d: Double) = acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d)))

    private fun norm360(x: Double) = ((x % 360) + 360) % 360

    fun sunPosition(epochMs: Long, lat: Double, lon: Double): SkyPosition {
        val lw = RAD * -lon; val phi = RAD * lat; val d = toDays(epochMs); val c = sunCoords(d)
        val h = siderealTime(d, lw) - c.ra
        return SkyPosition(norm360(azimuthRad(h, phi, c.dec) * DEG + 180), altitudeRad(h, phi, c.dec) * DEG)
    }

    fun phaseAt(epochMs: Long, lat: Double, lon: Double): LightPhase = LightPhase.of(sunPosition(epochMs, lat, lon).altitude)

    /** Times for the day whose local noon is [noonEpochMs]. */
    fun sunTimes(noonEpochMs: Long, lat: Double, lon: Double): SunTimes {
        val lw = RAD * -lon; val phi = RAD * lat; val d = toDays(noonEpochMs)
        val n = julianCycle(d, lw); val ds = approxTransit(0.0, lw, n)
        val m = solarMeanAnomaly(ds); val l = eclipticLongitude(m); val dec = declination(l, 0.0)
        val jNoon = solarTransitJ(ds, m, l)
        fun at(angle: Double, rising: Boolean): Long? {
            val w = hourAngle(angle * RAD, phi, dec)
            if (w.isNaN()) return null
            val jSet = solarTransitJ(approxTransit(w, lw, n), m, l)
            return fromJulian(if (rising) jNoon - (jSet - jNoon) else jSet)
        }
        return SunTimes(
            solarNoon = fromJulian(jNoon),
            sunrise = at(-0.833, true), sunset = at(-0.833, false),
            goldenMorningStart = at(-4.0, true), goldenMorningEnd = at(6.0, true),
            goldenEveningStart = at(6.0, false), goldenEveningEnd = at(-4.0, false),
            blueMorningStart = at(-6.0, true), blueMorningEnd = at(-4.0, true),
            blueEveningStart = at(-4.0, false), blueEveningEnd = at(-6.0, false),
            civilDawn = at(-6.0, true), civilDusk = at(-6.0, false),
            nauticalDawn = at(-12.0, true), nauticalDusk = at(-12.0, false),
            astroDawn = at(-18.0, true), astroDusk = at(-18.0, false),
        )
    }

    data class PathPoint(val epochMs: Long, val azimuth: Double, val altitude: Double)

    /** Sun positions from [startEpochMs] for 24 hours, every [stepMin] minutes. */
    fun sunPath(startEpochMs: Long, lat: Double, lon: Double, stepMin: Int = 30): List<PathPoint> {
        val step = maxOf(1, stepMin) * 60_000L
        return (0..(24 * 60 / maxOf(1, stepMin))).map { i ->
            val t = startEpochMs + i * step
            val p = sunPosition(t, lat, lon)
            PathPoint(t, p.azimuth, p.altitude)
        }
    }

    /* Moon */
    private fun moonCoords(d: Double): Coords {
        val lm = RAD * (218.316 + 13.176396 * d); val mm = RAD * (134.963 + 13.064993 * d); val f = RAD * (93.272 + 13.229350 * d)
        val l = lm + RAD * 6.289 * sin(mm); val b = RAD * 5.128 * sin(f); val dt = 385001 - 20905 * cos(mm)
        return Coords(declination(l, b), rightAscension(l, b), dt)
    }
    private fun moonPosRaw(epochMs: Long, lat: Double, lon: Double): Pair<Double, Double> {
        val lw = RAD * -lon; val phi = RAD * lat; val d = toDays(epochMs); val c = moonCoords(d)
        val h = siderealTime(d, lw) - c.ra
        var alt = altitudeRad(h, phi, c.dec)
        alt += astroRefraction(alt)
        return azimuthRad(h, phi, c.dec) to alt
    }
    private fun moonIllum(epochMs: Long): Pair<Double, Double> {
        val d = toDays(epochMs); val s = sunCoords(d); val m = moonCoords(d); val sdist = 149598000.0
        val phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra))
        val inc = atan2(sdist * sin(phi), m.dist - sdist * cos(phi))
        val angle = atan2(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra))
        return (1 + cos(inc)) / 2 to 0.5 + 0.5 * inc * (if (angle < 0) -1 else 1) / PI
    }
    fun phaseName(p: Double) = when {
        p < 0.03 || p >= 0.97 -> "New moon"
        p < 0.22 -> "Waxing crescent"
        p < 0.28 -> "First quarter"
        p < 0.47 -> "Waxing gibbous"
        p < 0.53 -> "Full moon"
        p < 0.72 -> "Waning gibbous"
        p < 0.78 -> "Last quarter"
        else -> "Waning crescent"
    }

    /** Rise and set within the 24 h starting at [dayStartEpochMs], by hourly scan and quadratic interpolation. */
    private fun moonTimes(dayStartEpochMs: Long, lat: Double, lon: Double): Pair<Long?, Long?> {
        val hc = 0.133 * RAD
        fun alt(i: Int) = moonPosRaw(dayStartEpochMs + i * 3_600_000L, lat, lon).second - hc
        var rise: Double? = null; var set: Double? = null; var h0 = alt(0)
        var i = 1
        while (i <= 24) {
            val h1 = alt(i); val h2 = alt(i + 1)
            val a = (h0 + h2) / 2 - h1; val b = (h2 - h0) / 2; val xe = -b / (2 * a); val ye = (a * xe + b) * xe + h1
            val disc = b * b - 4 * a * h1
            if (disc >= 0) {
                val dx = sqrt(disc) / (abs(a) * 2)
                val roots = listOf(xe - dx, xe + dx).filter { abs(it) <= 1 }
                if (roots.size == 1) {
                    if (h0 < 0) { if (rise == null) rise = i + roots[0] } else if (set == null) set = i + roots[0]
                } else if (roots.size == 2) {
                    if (rise == null) rise = i + if (ye < 0) roots[1] else roots[0]
                    if (set == null) set = i + if (ye < 0) roots[0] else roots[1]
                }
            }
            if (rise != null && set != null) break
            h0 = h2
            i += 2
        }
        fun toMs(v: Double?) = if (v == null || !v.isFinite() || v > 24 || v < 0) null else dayStartEpochMs + (v * 3_600_000).roundToLong()
        return toMs(rise) to toMs(set)
    }

    fun moon(epochMs: Long, dayStartEpochMs: Long, lat: Double, lon: Double): MoonInfo {
        val (az, alt) = moonPosRaw(epochMs, lat, lon)
        val (fraction, phase) = moonIllum(epochMs)
        val (rise, set) = moonTimes(dayStartEpochMs, lat, lon)
        return MoonInfo(norm360(az * DEG + 180), alt * DEG, fraction, phase, phaseName(phase), rise, set)
    }
}
