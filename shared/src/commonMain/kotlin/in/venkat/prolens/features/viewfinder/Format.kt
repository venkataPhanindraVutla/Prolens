package `in`.venkat.prolens.features.viewfinder

import `in`.venkat.prolens.core.photomath.PhotoFormat
import `in`.venkat.prolens.core.platform.CameraCapabilities
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToInt

internal const val MINUS = "−"

/** A number with a typographic minus, hiding the sign when it rounds to zero. */
internal fun signed(v: Double, decimals: Int = 0): String = PhotoFormat.fixed(v, decimals).replace("-", MINUS)

internal fun fmtEv(ev: Double): String {
    val r = PhotoFormat.fixed(abs(ev), 1)
    val sign = if (r == "0.0") "" else if (ev > 0) "+" else MINUS
    return sign + r
}

internal fun fmtFocus(m: Double): String =
    if (m >= 500) "∞" else "${PhotoFormat.trim(m, if (m < 1) 2 else 1)} m"

/** Focus slider position 0..100 is log-spaced from 0.1 m; 100 is infinity. */
internal fun focusToPos(m: Double): Int = (log10(max(m, 0.1) / 0.1) / 4 * 100).roundToInt().coerceIn(0, 100)

internal fun focusFromPos(p: Int): Double {
    if (p >= 100) return 1000.0
    val v = 0.1 * 10.0.pow(p / 100.0 * 4)
    val s = 10.0.pow(floor(log10(v)) - 1)
    return (v / s).roundToInt() * s
}

/** Nearest slider position a lens can focus to, given its minimum focus distance in diopters. */
internal fun focusMinPos(minFocusDiopters: Float): Int {
    if (minFocusDiopters <= 0f) return 0
    val nearM = max(0.1, 1.0 / minFocusDiopters)
    return ceil(log10(nearM / 0.1) / 4 * 100).toInt().coerceIn(0, 100)
}

internal fun wrap180(d: Double): Double = ((d + 180) % 360 + 360) % 360 - 180

internal fun angleName(pitch: Float): String = when {
    pitch < -70 -> "Overhead"
    pitch < -10 -> "High angle"
    pitch > 60 -> "Worm's-eye"
    pitch > 10 -> "Low angle"
    else -> "Eye level"
}

/** Horizontal and vertical field of view in degrees, seen on a portrait screen. */
internal data class Fov(val h: Double, val v: Double)

internal fun fieldOfView(caps: CameraCapabilities): Fov {
    val f = caps.focalLengthMm
    val sw = caps.sensorWidthMm
    val sh = caps.sensorHeightMm
    if (f == null || sw == null || sh == null || f <= 0f) return Fov(50.0, 66.0)
    fun deg(side: Float) = 2 * atan(side / (2.0 * f)) * 180 / kotlin.math.PI
    return Fov(deg(sh), deg(sw))
}

/** Share of the preview width the target lens covers, or null when it is wider than the phone camera. */
internal fun lensFrameRatio(phoneEq: Double, targetEq: Double): Double? =
    if (targetEq < phoneEq) null else phoneEq / targetEq
