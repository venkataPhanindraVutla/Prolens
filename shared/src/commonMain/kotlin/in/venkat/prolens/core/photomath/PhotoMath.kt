package `in`.venkat.prolens.core.photomath

import `in`.venkat.prolens.core.model.Body
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.ln
import kotlin.math.log2
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sqrt
import kotlin.math.tan
import kotlin.math.PI

/**
 * Photography maths. Units: focal length and sensor in mm, distances in mm unless the name ends in M,
 * shutter t in seconds, N is the f-number.
 */
object PhotoMath {
    const val FF_DIAG = 43.267

    fun diag(b: Body) = hypot(b.sensorW, b.sensorH)
    fun cropFactor(b: Body) = FF_DIAG / diag(b)
    /** Circle of confusion, mm. */
    fun coc(b: Body) = diag(b) / 1500
    fun pixelPitchUm(b: Body) = b.sensorW * 1000 / sqrt(b.megapixels * 1e6 * b.sensorW / b.sensorH)
    /** Rough f-number where diffraction softening starts. */
    fun diffractionLimitN(b: Body) = 1.5 * pixelPitchUm(b)
    fun eqFocal(f: Double, b: Body) = f * cropFactor(b)
    fun fovDeg(f: Double, dimMm: Double) = 2 * atan(dimMm / (2 * f)) * 180 / PI

    fun hyperfocal(f: Double, n: Double, c: Double) = f * f / (n * c) + f

    data class Dof(val hyperfocal: Double, val near: Double, val far: Double) {
        val total: Double get() = far - near
    }
    /** s in mm. far is +Infinity at or past the hyperfocal distance. */
    fun dof(f: Double, n: Double, c: Double, s: Double): Dof {
        val h = hyperfocal(f, n, c)
        val near = s * (h - f) / (h + s - 2 * f)
        val far = if (s >= h) Double.POSITIVE_INFINITY else s * (h - f) / (h - s)
        return Dof(h, near, far)
    }

    /** Blur disc on the sensor (mm) for a background xd behind a subject at s. */
    fun blurDisc(f: Double, n: Double, s: Double, xd: Double): Double {
        val m = f / (s - f)
        return (f * m / n) * (xd / (s + xd))
    }
    fun blurPctOfWidth(f: Double, n: Double, s: Double, xd: Double, b: Body) = blurDisc(f, n, s, xd) / b.sensorW * 100

    /* Exposure */
    fun ev100(n: Double, t: Double) = log2(n * n / t)
    /** Scene EV at ISO 100 that this setting exposes correctly. */
    fun evAtIso(n: Double, t: Double, iso: Double) = ev100(n, t) - log2(iso / 100)
    fun shutterFor(n: Double, ev: Double, iso: Double) = n * n / 2.0.pow(ev + log2(iso / 100))
    fun apertureFor(t: Double, ev: Double, iso: Double) = sqrt(t * 2.0.pow(ev + log2(iso / 100)))
    fun isoFor(n: Double, t: Double, ev: Double) = 100 * 2.0.pow(ev100(n, t) - ev)
    fun ndShutter(t: Double, stops: Double) = t * 2.0.pow(stops)
    fun handheldMin(f: Double, crop: Double, stabStops: Double = 0.0) = 1 / (f * crop) * 2.0.pow(stabStops)
    fun rule500(f: Double, crop: Double) = 500 / (f * crop)
    /** NPF rule: real focal length, pixel pitch in µm. */
    fun npf(n: Double, pitchUm: Double, f: Double) = (35 * n + 30 * pitchUm) / f
    fun shadowLength(heightM: Double, elevDeg: Double) =
        if (elevDeg <= 0) Double.POSITIVE_INFINITY else heightM / tan(elevDeg * PI / 180)
    fun flashDistanceM(gn: Double, n: Double, iso: Double = 100.0) = gn * sqrt(iso / 100) / n

    /* Standard one-third-stop scales */
    val SHUTTERS = listOf(1.0 / 8000, 1.0 / 6400, 1.0 / 5000, 1.0 / 4000, 1.0 / 3200, 1.0 / 2500, 1.0 / 2000, 1.0 / 1600, 1.0 / 1250, 1.0 / 1000,
        1.0 / 800, 1.0 / 640, 1.0 / 500, 1.0 / 400, 1.0 / 320, 1.0 / 250, 1.0 / 200, 1.0 / 160, 1.0 / 125, 1.0 / 100, 1.0 / 80, 1.0 / 60,
        1.0 / 50, 1.0 / 40, 1.0 / 30, 1.0 / 25, 1.0 / 20, 1.0 / 15, 1.0 / 13, 1.0 / 10, 1.0 / 8, 1.0 / 6, 1.0 / 5, 1.0 / 4, 0.3, 0.4, 0.5,
        0.6, 0.8, 1.0, 1.3, 1.6, 2.0, 2.5, 3.2, 4.0, 5.0, 6.0, 8.0, 10.0, 13.0, 15.0, 20.0, 25.0, 30.0)
    val APERTURES = listOf(1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.5, 4.0, 4.5, 5.0, 5.6, 6.3, 7.1, 8.0, 9.0, 10.0, 11.0, 13.0,
        14.0, 16.0, 18.0, 20.0, 22.0, 32.0)
    val ISOS = listOf(50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000,
        6400, 8000, 10000, 12800, 25600)

    data class NdFilter(val name: String, val stops: Double)
    val ND_FILTERS = listOf(NdFilter("ND2", 1.0), NdFilter("ND4", 2.0), NdFilter("ND8", 3.0), NdFilter("ND16", 4.0),
        NdFilter("ND64", 6.0), NdFilter("ND400", 8.6), NdFilter("ND1000", 10.0), NdFilter("ND32000", 15.0))

    /** Nearest value on a scale, judged in stops (log distance). */
    fun nearest(scale: List<Double>, v: Double): Double = scale.minBy { abs(ln(it / v)) }
    fun nearestIso(v: Double): Int = ISOS.minBy { abs(ln(it / v)) }
}

/** Formatting in photographer units. */
object PhotoFormat {
    fun shutter(t: Double): String = when {
        !t.isFinite() -> "—"
        t >= 60 -> { val m = floor(t / 60).toInt(); val s = (t % 60).roundToInt(); if (s > 0) "${m}m ${s}s" else "${m}m" }
        t >= 0.3 -> "${trim(t, if (t < 10) 1 else 0)}s"
        else -> "1/${(1 / t).roundToInt()}"
    }
    fun aperture(n: Double) = "f/${trim(n, 1)}"
    fun distance(mm: Double): String = when {
        !mm.isFinite() -> "∞"
        mm < 10 -> "${fixed(mm, 1)} mm"
        mm < 1000 -> "${(mm / 10).roundToInt()} cm"
        else -> "${fixed(mm / 1000, if (mm < 10000) 2 else 1)} m"
    }
    fun ev(ev: Double) = "${if (ev > 0) "+" else ""}${trim(ev, 1)} EV"

    /** Fixed decimals without platform String.format. */
    fun fixed(v: Double, decimals: Int): String {
        val p = 10.0.pow(decimals)
        val r = (abs(v) * p).roundToInt()
        val whole = r / p.toInt()
        val frac = r % p.toInt()
        val sign = if (v < 0 && r != 0) "-" else ""
        return if (decimals == 0) "$sign$whole" else "$sign$whole.${frac.toString().padStart(decimals, '0')}"
    }
    /** Like fixed(), but drops trailing zeros: 2.80 → 2.8, 8.0 → 8. */
    fun trim(v: Double, decimals: Int): String = fixed(v, decimals).let { if ('.' in it) it.trimEnd('0').trimEnd('.') else it }
}
