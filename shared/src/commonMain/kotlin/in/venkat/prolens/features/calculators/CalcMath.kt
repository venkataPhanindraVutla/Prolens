package `in`.venkat.prolens.features.calculators

import `in`.venkat.prolens.core.model.Lens
import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.photomath.PhotoMath
import kotlin.math.ceil
import kotlin.math.ln
import kotlin.math.pow

/** The lens's widest aperture followed by every standard stop up to its narrowest. */
internal fun apertureList(lens: Lens): List<Double> {
    val lo = lens.maxAperture
    val hi = lens.minAperture
    return listOf(lo) + PhotoMath.APERTURES.filter { it > lo + 0.01 && it <= hi + 0.01 }
}

/** Position 0..1000 of [v] on a log scale from [min] to [max]. */
internal fun logPos(v: Double, min: Double, max: Double): Double = 1000 * ln(v / min) / ln(max / min)

internal fun logVal(p: Double, min: Double, max: Double): Double = min * (max / min).pow(p / 1000)

internal fun snapShutter(t: Double): Double = PhotoMath.nearest(PhotoMath.SHUTTERS, t)

internal data class BlurVerdict(val label: String, val text: String)

internal fun blurVerdict(pct: Double): BlurVerdict = when {
    pct < 1 -> BlurVerdict("Barely blurred", "The background stays detailed.")
    pct < 3 -> BlurVerdict("Soft", "The background is clearly out of focus but still readable.")
    pct < 8 -> BlurVerdict("Creamy", "Smooth separation, the classic portrait look.")
    else -> BlurVerdict("Very strong", "The background melts into large soft discs.")
}

internal fun formatPct(p: Double): String = "${PhotoFormat.fixed(p, if (p < 1) 2 else 1)}%"

/** mm:ss, rounding up so the display never reads 00:00 while time is left. */
internal fun formatCountdown(seconds: Double): String {
    val s = ceil(seconds.coerceAtLeast(0.0)).toInt()
    return "${(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}"
}

internal fun formatMetres(m: Double): String = PhotoFormat.distance(m * 1000)

internal fun formatFocal(mm: Double): String = "${PhotoFormat.trim(mm, 1)} mm"
