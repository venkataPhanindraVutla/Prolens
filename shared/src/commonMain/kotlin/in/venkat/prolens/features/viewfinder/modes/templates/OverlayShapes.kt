package `in`.venkat.prolens.features.viewfinder.modes.templates

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

/**
 * Overlay geometry in the photographer's held frame, in 0..1 of its width and height (origin top-left).
 * Pure data, so it can be tested and drawn by any renderer.
 */
sealed interface OShape { val dashed: Boolean }

data class OLine(val x1: Float, val y1: Float, val x2: Float, val y2: Float, override val dashed: Boolean = false) : OShape
data class OPoly(val points: List<Pair<Float, Float>>, val closed: Boolean = false, override val dashed: Boolean = false) : OShape
data class OOval(val cx: Float, val cy: Float, val rx: Float, val ry: Float, override val dashed: Boolean = false) : OShape

/** Every point the shape touches at its extremes, for bounds checks. */
fun OShape.extremes(): List<Pair<Float, Float>> = when (this) {
    is OLine -> listOf(x1 to y1, x2 to y2)
    is OPoly -> points
    is OOval -> listOf(cx - rx to cy - ry, cx + rx to cy + ry)
}

/** Builds shapes for a frame whose width / height is [a]. Sizes are given in fractions of the frame height. */
internal class Frame(val a: Float) {
    /** Smaller side as a fraction of the height; sizes scaled by it never leave the frame sideways. */
    val m: Float = min(1f, a)
    val out = mutableListOf<OShape>()

    /** A length of [h] frame heights, as a fraction of the width. */
    fun x(h: Float) = h / a

    fun line(x1: Float, y1: Float, x2: Float, y2: Float, dashed: Boolean = false) { out += OLine(x1, y1, x2, y2, dashed) }
    fun poly(pts: List<Pair<Float, Float>>, closed: Boolean = false, dashed: Boolean = false) { out += OPoly(pts, closed, dashed) }
    fun oval(cx: Float, cy: Float, rxH: Float, ryH: Float, dashed: Boolean = false) { out += OOval(cx, cy, x(rxH), ryH, dashed) }
    fun circle(cx: Float, cy: Float, rH: Float, dashed: Boolean = false) = oval(cx, cy, rH, rH, dashed)
    fun rect(x0: Float, y0: Float, x1: Float, y1: Float, dashed: Boolean = false) =
        poly(listOf(x0 to y0, x1 to y0, x1 to y1, x0 to y1), closed = true, dashed = dashed)

    /** A head: an oval [hh] tall with its top at [top]. */
    fun head(cx: Float, top: Float, hh: Float) = oval(cx, top + hh / 2, hh * 0.38f, hh / 2)

    /** Neck and shoulders: starts at the head's chin and runs to [bottom]; [wf] is the shoulder width in head heights. */
    fun shoulders(cx: Float, chin: Float, hh: Float, bottom: Float, wf: Float) {
        val sw = x(hh * wf) / 2
        val nw = x(hh * 0.2f)
        val ys = chin + hh * 0.22f
        val drop = hh * 0.3f
        fun side(sign: Float): List<Pair<Float, Float>> {
            val pts = mutableListOf<Pair<Float, Float>>()
            pts += cx + sign * sw to bottom
            pts += cx + sign * sw to ys + drop
            for (i in 1..6) {
                val t = i / 6f
                val ease = sin(t * PI.toFloat() / 2)
                pts += (cx + sign * (sw + (nw - sw) * t)) to (ys + drop * (1 - ease))
            }
            pts += cx + sign * nw to chin
            return pts
        }
        poly(side(-1f))
        poly(side(1f))
    }

    /** Head, neck and shoulders in one go. */
    fun bust(cx: Float, top: Float, hh: Float, bottom: Float, wf: Float = 2.3f) {
        head(cx, top, hh)
        shoulders(cx, top + hh, hh, bottom, wf)
    }

    fun eyeLine(y: Float) = line(0.04f, y, 0.96f, y, dashed = true)

    fun arc(cx: Float, cy: Float, rxH: Float, ryH: Float, from: Double, to: Double, n: Int = 16): List<Pair<Float, Float>> =
        (0..n).map { i ->
            val t = from + (to - from) * i / n
            (cx + x(rxH) * cos(t).toFloat()) to (cy + ryH * sin(t).toFloat())
        }
}
