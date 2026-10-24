package `in`.venkat.prolens.features.viewfinder.modes.panorama

import `in`.venkat.prolens.core.platform.RgbImage
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.tan

/** Where a frame sits on the canvas, in pixels. */
internal data class Placement(val x: Int, val y: Int)

/** Pure-Kotlin panorama stitching: cylindrical warp, SAD refinement on luma, feathered blend, row crop. */
internal object Stitcher {
    const val SEARCH_X = 40
    const val SEARCH_Y = 20
    private const val COARSE = 4
    private const val MIN_SAMPLES = 150

    /** Focal length in pixels for an image [width] px wide that spans [fovDeg] degrees. */
    fun focalPx(width: Int, fovDeg: Double): Double = width / (2 * tan(fovDeg * PI / 360))

    /**
     * Projects a flat frame onto a cylinder of radius [fPx]. The output width is the arc length the frame covers
     * (forced odd so there is a true centre column), so the centre column is untouched and the edges map to the edges.
     */
    fun cylindricalWarp(src: RgbImage, fPx: Double): RgbImage {
        val w = src.width
        val h = src.height
        val half = w / 2.0
        var ow = (2 * fPx * atan(half / fPx)).roundToInt()
        if (ow % 2 == 0) ow += 1
        ow = max(ow, 1)
        val out = IntArray(ow * h)
        val ocx = (ow - 1) / 2.0
        val scx = (w - 1) / 2.0
        val cy = (h - 1) / 2.0
        for (x in 0 until ow) {
            val a = (x - ocx) / fPx
            val xs = scx + fPx * tan(a)
            val k = 1.0 / cos(a)
            if (xs < 0 || xs > w - 1) continue
            val x0 = floor(xs).toInt()
            val x1 = min(x0 + 1, w - 1)
            val fx = xs - x0
            for (y in 0 until h) {
                val ys = cy + (y - cy) * k
                if (ys < 0 || ys > h - 1) continue
                val y0 = floor(ys).toInt()
                val y1 = min(y0 + 1, h - 1)
                val fy = ys - y0
                out[y * ow + x] = bilinear(src.argb, w, x0, x1, y0, y1, fx, fy)
            }
        }
        return RgbImage(ow, h, out)
    }

    private fun bilinear(p: IntArray, w: Int, x0: Int, x1: Int, y0: Int, y1: Int, fx: Double, fy: Double): Int {
        val a = p[y0 * w + x0]; val b = p[y0 * w + x1]; val c = p[y1 * w + x0]; val d = p[y1 * w + x1]
        var r = 0xFF shl 24
        for (shift in intArrayOf(16, 8, 0)) {
            val top = ((a ushr shift) and 0xFF) * (1 - fx) + ((b ushr shift) and 0xFF) * fx
            val bot = ((c ushr shift) and 0xFF) * (1 - fx) + ((d ushr shift) and 0xFF) * fx
            val v = (top * (1 - fy) + bot * fy + 0.5).toInt().coerceIn(0, 255)
            r = r or (v shl shift)
        }
        return r
    }

    /** Signed difference of two compass headings, −180..180. */
    fun headingDelta(from: Double, to: Double): Double = ((to - from) % 360 + 540) % 360 - 180

    /**
     * Stitches [frames] taken at [headingsDeg], each spanning [fovDeg] horizontally. Returns null for fewer than one frame.
     */
    fun stitch(frames: List<RgbImage>, headingsDeg: List<Double>, fovDeg: Double): RgbImage? {
        if (frames.isEmpty()) return null
        val f = focalPx(frames[0].width, fovDeg)
        val warped = frames.map { cylindricalWarp(it, f) }
        val rel = List(warped.size) { i ->
            if (i == 0) 0.0 else f * headingDelta(headingsDeg[i - 1], headingsDeg[i]) * PI / 180
        }
        val placements = refine(warped, rel)
        return blend(warped, placements)
    }

    /**
     * Places each frame against the one before it. [guessDx] holds the expected x step from the previous frame
     * (index 0 is ignored). The search covers ±[SEARCH_X] around the guess and ±[SEARCH_Y] vertically, coarse on
     * downsampled luma, then one pixel steps at full size. Positions are normalised so the smallest x and y are 0.
     */
    fun refine(frames: List<RgbImage>, guessDx: List<Double>): List<Placement> {
        val xs = IntArray(frames.size)
        val ys = IntArray(frames.size)
        var prevLuma = luma(frames[0])
        for (i in 1 until frames.size) {
            val curLuma = luma(frames[i])
            val g = guessDx[i].roundToInt()
            val (dx, dy) = searchPair(frames[i - 1], prevLuma, frames[i], curLuma, g)
            xs[i] = xs[i - 1] + dx
            ys[i] = ys[i - 1] + dy
            prevLuma = curLuma
        }
        val mx = xs.min()
        val my = ys.min()
        return List(frames.size) { Placement(xs[it] - mx, ys[it] - my) }
    }

    private class Luma(val w: Int, val h: Int, val v: ShortArray, val ok: BooleanArray)

    private fun luma(img: RgbImage): Luma {
        val n = img.width * img.height
        val v = ShortArray(n)
        val ok = BooleanArray(n)
        for (i in 0 until n) {
            val p = img.argb[i]
            ok[i] = (p ushr 24) != 0
            v[i] = ((((p shr 16) and 0xFF) * 77 + ((p shr 8) and 0xFF) * 150 + (p and 0xFF) * 29) shr 8).toShort()
        }
        return Luma(img.width, img.height, v, ok)
    }

    private fun down(l: Luma, k: Int): Luma {
        val w = max(l.w / k, 1)
        val h = max(l.h / k, 1)
        val v = ShortArray(w * h)
        val ok = BooleanArray(w * h)
        for (y in 0 until h) for (x in 0 until w) {
            var s = 0
            var good = true
            for (j in 0 until k) for (i in 0 until k) {
                val idx = (y * k + j) * l.w + x * k + i
                s += l.v[idx]
                if (!l.ok[idx]) good = false
            }
            v[y * w + x] = (s / (k * k)).toShort()
            ok[y * w + x] = good
        }
        return Luma(w, h, v, ok)
    }

    /** Mean absolute difference over the overlap when [b] sits at ([dx], [dy]) in [a]'s frame; MAX if too little overlaps. */
    private fun sad(a: Luma, b: Luma, dx: Int, dy: Int, stride: Int): Double {
        val x0 = max(0, dx); val x1 = min(a.w, dx + b.w)
        val y0 = max(0, dy); val y1 = min(a.h, dy + b.h)
        if (x1 - x0 < 2 || y1 - y0 < 2) return Double.MAX_VALUE
        var sum = 0L
        var n = 0
        var y = y0
        while (y < y1) {
            val ra = y * a.w
            val rb = (y - dy) * b.w - dx
            var x = x0
            while (x < x1) {
                if (a.ok[ra + x] && b.ok[rb + x]) {
                    sum += abs(a.v[ra + x] - b.v[rb + x])
                    n++
                }
                x += stride
            }
            y += stride
        }
        return if (n < MIN_SAMPLES / (stride * stride).coerceAtLeast(1) + 20) Double.MAX_VALUE else sum.toDouble() / n
    }

    private fun searchPair(a: RgbImage, la: Luma, b: RgbImage, lb: Luma, guess: Int): Pair<Int, Int> {
        val ca = down(la, COARSE)
        val cb = down(lb, COARSE)
        var best = Double.MAX_VALUE
        var bx = guess
        var by = 0
        val rx = SEARCH_X / COARSE
        val ry = SEARCH_Y / COARSE
        val gc = roundDiv(guess, COARSE)
        for (cy in -ry..ry) for (cx in gc - rx..gc + rx) {
            val s = sad(ca, cb, cx, cy, 1)
            if (s == Double.MAX_VALUE) continue
            val score = s + 0.01 * (abs(cx - gc) + abs(cy))
            if (score < best) { best = score; bx = cx * COARSE; by = cy * COARSE }
        }
        if (best == Double.MAX_VALUE) return guess to 0
        var fbest = Double.MAX_VALUE
        var fx = bx
        var fy = by
        for (y in by - COARSE..by + COARSE) for (x in bx - COARSE..bx + COARSE) {
            val s = sad(la, lb, x, y, 2)
            if (s < fbest) { fbest = s; fx = x; fy = y }
        }
        return fx to fy
    }

    private fun roundDiv(a: Int, k: Int): Int = floor(a.toDouble() / k + 0.5).toInt()

    /** Rows every frame covers, as a half-open range in canvas rows. A frame is valid on the rows its outer columns are. */
    internal fun commonRows(frames: List<RgbImage>, placements: List<Placement>): IntRange {
        var top = 0
        var bottom = Int.MAX_VALUE
        for (i in frames.indices) {
            val f = frames[i]
            var first = -1
            var last = -1
            for (y in 0 until f.height) {
                val ok = (f.argb[y * f.width] ushr 24) != 0 && (f.argb[y * f.width + f.width - 1] ushr 24) != 0
                if (ok) { if (first < 0) first = y; last = y }
            }
            if (first < 0) return IntRange.EMPTY
            top = max(top, placements[i].y + first)
            bottom = min(bottom, placements[i].y + last)
        }
        return top..bottom
    }

    /** Feathers neighbouring frames linearly across their overlap and crops to the rows every frame covers. */
    fun blend(frames: List<RgbImage>, placements: List<Placement>): RgbImage {
        val width = frames.indices.maxOf { placements[it].x + frames[it].width }
        val rows = commonRows(frames, placements)
        val outH = if (rows.isEmpty()) frames[0].height else rows.last - rows.first + 1
        val y0 = if (rows.isEmpty()) 0 else rows.first
        val out = IntArray(width * outH)
        for (oy in 0 until outH) {
            val cy = y0 + oy
            for (x in 0 until width) {
                var wr = 0f; var wg = 0f; var wb = 0f; var wsum = 0f
                for (i in frames.indices) {
                    val f = frames[i]
                    val lx = x - placements[i].x
                    val ly = cy - placements[i].y
                    if (lx < 0 || lx >= f.width || ly < 0 || ly >= f.height) continue
                    val p = f.argb[ly * f.width + lx]
                    if ((p ushr 24) == 0) continue
                    val wt = min(lx + 1, f.width - lx).toFloat()
                    wr += ((p shr 16) and 0xFF) * wt
                    wg += ((p shr 8) and 0xFF) * wt
                    wb += (p and 0xFF) * wt
                    wsum += wt
                }
                out[oy * width + x] = if (wsum <= 0f) 0xFF000000.toInt() else
                    (0xFF shl 24) or ((wr / wsum + 0.5f).toInt() shl 16) or ((wg / wsum + 0.5f).toInt() shl 8) or (wb / wsum + 0.5f).toInt()
            }
        }
        return RgbImage(width, outH, out)
    }
}
