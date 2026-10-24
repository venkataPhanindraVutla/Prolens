package `in`.venkat.prolens.features.viewfinder

import `in`.venkat.prolens.core.photomath.PhotoFormat
import kotlin.math.PI
import kotlin.math.atan
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.tan

/** One-tap lens chips for a camera whose zoom runs [min]..[max]: the ultra-wide if there is one, 1×, 2×, then 3× or 5× and 10×. */
internal fun zoomPresets(min: Float, max: Float): List<Float> {
    val out = mutableListOf<Float>()
    if (min < 0.95f) out += (min * 10).roundToInt() / 10f
    out += 1f
    when {
        max >= 2f -> out += 2f
        max > 1.05f -> out += (max * 10).toInt() / 10f
    }
    when {
        max >= 5f -> out += 5f
        max >= 3f -> out += 3f
    }
    if (max >= 10f) out += 10f
    return out
}

/** The chip the current zoom belongs to: the largest preset at or below it, like the system camera. */
internal fun activePreset(presets: List<Float>, ratio: Float): Int =
    presets.indexOfLast { it <= ratio + 0.01f }.coerceAtLeast(0)

internal fun fmtZoom(r: Float): String = "${PhotoFormat.trim(r.toDouble(), 1)}×"

/** The fine dial: every [pxPerDoubling] of drag doubles (or halves) the zoom. */
internal fun zoomFromDrag(start: Float, dragPx: Float, pxPerDoubling: Float, min: Float, max: Float): Float =
    (start * 2f.pow(dragPx / pxPerDoubling)).coerceIn(min, max)

/**
 * Field of view after zooming by [zoom] and cropping to [sensorRatio] (long / short). The screen's
 * horizontal is the sensor's short side, so a wide crop trims the horizontal and keeps the vertical.
 */
internal fun zoomedFov(base: Fov, zoom: Float, sensorRatio: Double?): Fov {
    fun t(deg: Double) = tan(deg * PI / 360)
    fun a(t: Double) = atan(t) * 360 / PI
    val shortT = t(base.h)
    val longT = t(base.v)
    val croppedShort = if (sensorRatio == null) shortT else min(shortT, longT / sensorRatio)
    val z = zoom.coerceAtLeast(0.1f).toDouble()
    return Fov(a(croppedShort / z), a(longT / z))
}

/** A drag on the screen, turned into the photographer's frame for this hold: +x is their right, +y their down. */
internal fun heldDelta(dx: Float, dy: Float, hold: Int): Pair<Float, Float> = when (hold) {
    90 -> (-dy + 0f) to (dx + 0f)
    180 -> (-dx + 0f) to (-dy + 0f)
    270 -> (dy + 0f) to (-dx + 0f)
    else -> (dx + 0f) to (dy + 0f)
}
