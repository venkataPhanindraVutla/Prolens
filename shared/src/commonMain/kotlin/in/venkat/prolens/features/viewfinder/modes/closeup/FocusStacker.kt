package `in`.venkat.prolens.features.viewfinder.modes.closeup

import `in`.venkat.prolens.core.platform.RgbImage
import kotlin.math.abs

/** Pure-Kotlin focus stacking: align to the first frame, pick the sharpest frame per pixel, smooth the choice. */
object FocusStacker {
    /** How far a frame may have moved against the first, in pixels. */
    const val MAX_SHIFT = 10

    /** Frame offset: the pixel at (x, y) in the first frame appears at (x + dx, y + dy) in the other. */
    data class Shift(val dx: Int, val dy: Int)

    fun luma(img: RgbImage): IntArray = IntArray(img.width * img.height) {
        val p = img.argb[it]
        (77 * ((p shr 16) and 255) + 150 * ((p shr 8) and 255) + 29 * (p and 255)) shr 8
    }

    private fun halve(src: IntArray, w: Int, h: Int): IntArray {
        val w2 = w / 2
        val h2 = h / 2
        return IntArray(w2 * h2) { i ->
            val x = (i % w2) * 2
            val y = (i / w2) * 2
            (src[y * w + x] + src[y * w + x + 1] + src[(y + 1) * w + x] + src[(y + 1) * w + x + 1]) shr 2
        }
    }

    /** Mean absolute difference over the overlap, so shifts with different overlaps compare fairly. */
    private fun sad(ref: IntArray, img: IntArray, w: Int, h: Int, dx: Int, dy: Int, margin: Int, stride: Int): Long {
        var sum = 0L
        var n = 0
        var y = margin
        while (y < h - margin) {
            val yy = y + dy
            if (yy in 0 until h) {
                var x = margin
                while (x < w - margin) {
                    val xx = x + dx
                    if (xx in 0 until w) {
                        sum += abs(ref[y * w + x] - img[yy * w + xx]); n++
                    }
                    x += stride
                }
            }
            y += stride
        }
        return if (n == 0) Long.MAX_VALUE else sum * 1000 / n
    }

    /** Translation search, ±[maxShift] px: SAD on half-size luma, then a ±1 px refinement at full size. */
    fun findShift(ref: IntArray, img: IntArray, w: Int, h: Int, maxShift: Int = MAX_SHIFT): Shift {
        if (w < 32 || h < 32) return Shift(0, 0)
        val rs = halve(ref, w, h)
        val ims = halve(img, w, h)
        val w2 = w / 2
        val h2 = h / 2
        val r = (maxShift + 1) / 2
        var best = Long.MAX_VALUE
        var bx = 0
        var by = 0
        for (dy in -r..r) for (dx in -r..r) {
            val s = sad(rs, ims, w2, h2, dx, dy, r + 1, 1)
            if (s < best || (s == best && abs(dx) + abs(dy) < abs(bx) + abs(by))) { best = s; bx = dx; by = dy }
        }
        val cx = bx * 2
        val cy = by * 2
        best = Long.MAX_VALUE
        var fx = cx
        var fy = cy
        for (dy in cy - 1..cy + 1) for (dx in cx - 1..cx + 1) {
            if (abs(dx) > maxShift || abs(dy) > maxShift) continue
            val s = sad(ref, img, w, h, dx, dy, maxShift + 1, 2)
            if (s < best) { best = s; fx = dx; fy = dy }
        }
        return Shift(fx, fy)
    }

    /** Sum of the squared Laplacian over a 5x5 window around each pixel. Edges read as zero. */
    fun laplacianEnergy(luma: IntArray, w: Int, h: Int): FloatArray {
        val sq = FloatArray(w * h)
        for (y in 1 until h - 1) for (x in 1 until w - 1) {
            val i = y * w + x
            val l = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w]
            sq[i] = (l * l).toFloat()
        }
        val tmp = FloatArray(w * h)
        for (y in 0 until h) {
            var run = 0f
            for (x in 0 until minOf(2, w)) run += sq[y * w + x]
            for (x in 0 until w) {
                if (x + 2 < w) run += sq[y * w + x + 2]
                if (x - 3 >= 0) run -= sq[y * w + x - 3]
                tmp[y * w + x] = run
            }
        }
        val out = FloatArray(w * h)
        for (x in 0 until w) {
            var run = 0f
            for (y in 0 until minOf(2, h)) run += tmp[y * w + x]
            for (y in 0 until h) {
                if (y + 2 < h) run += tmp[(y + 2) * w + x]
                if (y - 3 >= 0) run -= tmp[(y - 3) * w + x]
                out[y * w + x] = run
            }
        }
        return out
    }

    private fun shifted(luma: IntArray, w: Int, h: Int, s: Shift): IntArray {
        // A pixel (x, y) of the first frame lives at (x + dx, y + dy) here.
        if (s.dx == 0 && s.dy == 0) return luma
        return IntArray(w * h) { i ->
            val x = (i % w + s.dx).coerceIn(0, w - 1)
            val y = (i / w + s.dy).coerceIn(0, h - 1)
            luma[y * w + x]
        }
    }

    /** Each pixel takes the most common choice among its 3x3 neighbours; ties keep the pixel's own. */
    internal fun majority(choice: ByteArray, w: Int, h: Int, count: Int): ByteArray {
        val out = ByteArray(choice.size)
        val votes = IntArray(count)
        for (y in 0 until h) for (x in 0 until w) {
            votes.fill(0)
            for (yy in maxOf(0, y - 1)..minOf(h - 1, y + 1)) for (xx in maxOf(0, x - 1)..minOf(w - 1, x + 1)) {
                votes[choice[yy * w + xx].toInt()]++
            }
            val own = choice[y * w + x].toInt()
            var best = own
            for (k in 0 until count) if (votes[k] > votes[best]) best = k
            out[y * w + x] = best.toByte()
        }
        return out
    }

    /** Merges [frames] (all the same size, near to far focus) into one image. [onStep] reports frames processed. */
    fun merge(frames: List<RgbImage>, onStep: (Int) -> Unit = {}): RgbImage {
        require(frames.isNotEmpty()) { "No frames to merge" }
        val first = frames[0]
        val w = first.width
        val h = first.height
        if (frames.size == 1) return first
        val lumas = ArrayList<IntArray>(frames.size)
        val shifts = ArrayList<Shift>(frames.size)
        val refLuma = luma(first)
        val best = FloatArray(w * h) { -1f }
        val choice = ByteArray(w * h)
        for ((k, f) in frames.withIndex()) {
            require(f.width == w && f.height == h) { "Frames differ in size" }
            val l = if (k == 0) refLuma else luma(f)
            val s = if (k == 0) Shift(0, 0) else findShift(refLuma, l, w, h)
            shifts += s
            lumas += l
            val e = laplacianEnergy(shifted(l, w, h, s), w, h)
            for (i in e.indices) if (e[i] > best[i]) { best[i] = e[i]; choice[i] = k.toByte() }
            onStep(k + 1)
        }
        val smooth = majority(choice, w, h, frames.size)
        val out = IntArray(w * h)
        for (i in out.indices) {
            val k = smooth[i].toInt()
            val s = shifts[k]
            val x = (i % w + s.dx).coerceIn(0, w - 1)
            val y = (i / w + s.dy).coerceIn(0, h - 1)
            out[i] = frames[k].argb[y * w + x] or (0xFF shl 24)
        }
        return RgbImage(w, h, out)
    }
}
